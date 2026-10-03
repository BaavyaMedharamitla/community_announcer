import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Database from 'better-sqlite3';
import nodemailer from 'nodemailer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const port = Number(process.env.PORT || 4000);
const db = new Database(path.join(__dirname, '../database/community.db'));

db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const now = () => new Date().toISOString();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function createSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS deliveries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      announcement_id INTEGER NOT NULL,
      member_id INTEGER NOT NULL,
      status TEXT NOT NULL,
      error TEXT DEFAULT '',
      sent_at TEXT,
      FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE,
      FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
    );
  `);
}

function seedDatabase() {
  const { count } = db.prepare('SELECT COUNT(*) AS count FROM groups').get();
  if (count > 0) return;

  const insertGroup = db.prepare('INSERT INTO groups (name, description, created_at) VALUES (?, ?, ?)');
  const insertMember = db.prepare('INSERT INTO members (group_id, name, email, created_at) VALUES (?, ?, ?, ?)');
  const seed = db.transaction(() => {
    const community = insertGroup.run('ECE Community', 'Students and coordinators', now()).lastInsertRowid;
    const volunteers = insertGroup.run('Event Volunteers', 'Active event volunteers', now()).lastInsertRowid;

    insertMember.run(community, 'Asha Rao', 'asha@example.com', now());
    insertMember.run(community, 'Ravi Kumar', 'ravi@example.com', now());
    insertMember.run(community, 'Meena S', 'meena@example.com', now());
    insertMember.run(volunteers, 'Kavin M', 'kavin@example.com', now());
    insertMember.run(volunteers, 'Nila P', 'nila@example.com', now());
  });

  seed();
}

createSchema();
seedDatabase();

const transporter = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  : null;

function getGroup(id) {
  const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(id);
  if (!group) return null;
  const members = db.prepare('SELECT * FROM members WHERE group_id = ? ORDER BY name COLLATE NOCASE').all(id);
  return { ...group, members };
}

function getGroups() {
  return db.prepare('SELECT * FROM groups ORDER BY name COLLATE NOCASE').all().map((group) => ({
    ...group,
    members: db.prepare('SELECT * FROM members WHERE group_id = ? ORDER BY name COLLATE NOCASE').all(group.id),
  }));
}

function getHistory() {
  const announcements = db.prepare(`
    SELECT announcements.*, groups.name AS group_name
    FROM announcements
    JOIN groups ON groups.id = announcements.group_id
    ORDER BY announcements.created_at DESC
  `).all();

  const deliveryQuery = db.prepare(`
    SELECT deliveries.status, deliveries.error, deliveries.sent_at, members.name, members.email
    FROM deliveries
    JOIN members ON members.id = deliveries.member_id
    WHERE deliveries.announcement_id = ?
    ORDER BY members.name COLLATE NOCASE
  `);

  return announcements.map((item) => ({
    id: item.id,
    date: item.created_at,
    group: item.group_name,
    subject: item.subject,
    body: item.body,
    recipients: deliveryQuery.all(item.id),
  }));
}

function validateId(value) {
  return Number.isInteger(Number(value)) && Number(value) > 0;
}

app.get('/api/health', async (_req, res) => {
  let smtpReachable = false;
  if (transporter) {
    try {
      await transporter.verify();
      smtpReachable = true;
    } catch {
      smtpReachable = false;
    }
  }

  res.json({
    ok: true,
    database: 'SQLite',
    emailConfigured: Boolean(transporter),
    smtpReachable,
  });
});

app.get('/api/groups', (_req, res) => res.json(getGroups()));

app.post('/api/groups', (req, res) => {
  const name = String(req.body.name || '').trim();
  const description = String(req.body.description || '').trim();
  if (!name) return res.status(400).json({ error: 'Group name is required.' });

  const result = db.prepare('INSERT INTO groups (name, description, created_at) VALUES (?, ?, ?)').run(name, description, now());
  res.status(201).json(getGroup(result.lastInsertRowid));
});

app.put('/api/groups/:id', (req, res) => {
  if (!validateId(req.params.id)) return res.status(400).json({ error: 'Invalid group id.' });
  const existing = getGroup(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Group not found.' });

  const name = req.body.name === undefined ? existing.name : String(req.body.name).trim();
  const description = req.body.description === undefined ? existing.description : String(req.body.description).trim();
  if (!name) return res.status(400).json({ error: 'Group name is required.' });

  db.prepare('UPDATE groups SET name = ?, description = ? WHERE id = ?').run(name, description, req.params.id);
  res.json(getGroup(req.params.id));
});

app.delete('/api/groups/:id', (req, res) => {
  if (!validateId(req.params.id)) return res.status(400).json({ error: 'Invalid group id.' });
  const result = db.prepare('DELETE FROM groups WHERE id = ?').run(req.params.id);
  if (!result.changes) return res.status(404).json({ error: 'Group not found.' });
  res.status(204).end();
});

app.post('/api/groups/:id/members', (req, res) => {
  if (!validateId(req.params.id)) return res.status(400).json({ error: 'Invalid group id.' });
  if (!getGroup(req.params.id)) return res.status(404).json({ error: 'Group not found.' });

  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!name || !emailPattern.test(email)) return res.status(400).json({ error: 'Enter a valid name and email address.' });

  const result = db.prepare('INSERT INTO members (group_id, name, email, created_at) VALUES (?, ?, ?, ?)').run(req.params.id, name, email, now());
  res.status(201).json(db.prepare('SELECT * FROM members WHERE id = ?').get(result.lastInsertRowid));
});

app.put('/api/members/:id', (req, res) => {
  if (!validateId(req.params.id)) return res.status(400).json({ error: 'Invalid member id.' });
  const member = db.prepare('SELECT * FROM members WHERE id = ?').get(req.params.id);
  if (!member) return res.status(404).json({ error: 'Member not found.' });

  const name = req.body.name === undefined ? member.name : String(req.body.name).trim();
  const email = req.body.email === undefined ? member.email : String(req.body.email).trim().toLowerCase();
  if (!name || !emailPattern.test(email)) return res.status(400).json({ error: 'Enter a valid name and email address.' });

  db.prepare('UPDATE members SET name = ?, email = ? WHERE id = ?').run(name, email, req.params.id);
  res.json(db.prepare('SELECT * FROM members WHERE id = ?').get(req.params.id));
});

app.delete('/api/members/:id', (req, res) => {
  if (!validateId(req.params.id)) return res.status(400).json({ error: 'Invalid member id.' });
  const result = db.prepare('DELETE FROM members WHERE id = ?').run(req.params.id);
  if (!result.changes) return res.status(404).json({ error: 'Member not found.' });
  res.status(204).end();
});

app.get('/api/history', (_req, res) => res.json(getHistory()));

app.post('/api/announcements', async (req, res) => {
  const groupId = Number(req.body.groupId);
  const subject = String(req.body.subject || '').trim();
  const body = String(req.body.message || '').trim();
  const group = getGroup(groupId);

  if (!group || !group.members.length || !subject || !body) {
    return res.status(400).json({ error: 'A group with members, subject and message are required.' });
  }

  if (!transporter) {
    return res.status(503).json({
      error: 'SMTP is not configured. Add the SMTP values in server/.env before sending real email.',
    });
  }

  const announcementId = db.prepare(
    'INSERT INTO announcements (group_id, subject, body, created_at) VALUES (?, ?, ?, ?)',
  ).run(groupId, subject, body, now()).lastInsertRowid;

  const insertDelivery = db.prepare(
    'INSERT INTO deliveries (announcement_id, member_id, status, error, sent_at) VALUES (?, ?, ?, ?, ?)',
  );

  const recipients = [];

  for (const member of group.members) {
    let status = 'failed';
    let error = '';
    let sentAt = null;

    try {
      const personalizedBody = body.replace(/{{\s*name\s*}}/gi, member.name);
      await transporter.sendMail({
        from: process.env.MAIL_FROM || process.env.SMTP_USER,
        to: member.email,
        subject,
        text: personalizedBody,
      });
      status = 'sent';
      sentAt = now();
    } catch (mailError) {
      error = mailError instanceof Error ? mailError.message : String(mailError);
    }

    insertDelivery.run(announcementId, member.id, status, error, sentAt);
    recipients.push({ name: member.name, email: member.email, status, error });
  }

  res.status(201).json({
    id: announcementId,
    date: now(),
    group: group.name,
    subject,
    body,
    recipients,
  });
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'Unexpected server error.' });
});

const server = app.listen(port, () => {
  console.log(`Community Announcer API running at http://localhost:${port}`);
  console.log(`Database: SQLite | Email: ${transporter ? 'configured' : 'not configured'}`);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${port} is already in use. Stop the existing Community Announcer API process or set another PORT in server/.env.`);
  } else {
    console.error('Server failed to start:', error);
  }
  process.exit(1);
});
