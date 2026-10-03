import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Archive,
  ArrowLeft,
  Bell,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  Edit3,
  Eye,
  FileText,
  History,
  Menu,
  Moon,
  MoreVertical,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Star,
  Sun,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import './styles.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const fallbackGroups = [
  {
    id: 'demo-1',
    name: 'ECE Community',
    description: 'Students and coordinators',
    members: [
      { id: 'demo-m1', name: 'Asha Rao', email: 'asha@example.com' },
      { id: 'demo-m2', name: 'Ravi Kumar', email: 'ravi@example.com' },
      { id: 'demo-m3', name: 'Meena S', email: 'meena@example.com' },
    ],
  },
  {
    id: 'demo-2',
    name: 'Event Volunteers',
    description: 'Active event volunteers',
    members: [
      { id: 'demo-m4', name: 'Kavin M', email: 'kavin@example.com' },
      { id: 'demo-m5', name: 'Nila P', email: 'nila@example.com' },
    ],
  },
];

function App() {
  const [view, setView] = useState('announcement');
  const [groups, setGroups] = useState([]);
  const [history, setHistory] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [connected, setConnected] = useState(false);
  const [emailConfigured, setEmailConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(() => localStorage.getItem('ca-theme') || 'light');
  const [toast, setToast] = useState(null);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [confirm, setConfirm] = useState(null);

  const selectedGroup = groups.find((group) => String(group.id) === String(selectedGroupId)) || groups[0] || null;
  const totalMembers = groups.reduce((sum, group) => sum + group.members.length, 0);
  const successfulDeliveries = history.reduce(
    (sum, item) => sum + item.recipients.filter((recipient) => recipient.status === 'sent').length,
    0,
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('ca-theme', theme);
  }, [theme]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 3600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function loadData() {
    setLoading(true);
    try {
      const [groupsResponse, historyResponse, healthResponse] = await Promise.all([
        fetch(`${API}/groups`),
        fetch(`${API}/history`),
        fetch(`${API}/health`),
      ]);
      if (!groupsResponse.ok || !historyResponse.ok) throw new Error('API unavailable');
      const [groupData, historyData] = await Promise.all([groupsResponse.json(), historyResponse.json()]);
      const health = healthResponse.ok ? await healthResponse.json() : {};
      const savedDemoHistory = JSON.parse(localStorage.getItem('ca-demo-history') || '[]');
      const mergedHistory = [...historyData, ...savedDemoHistory].sort((a, b) => new Date(b.date) - new Date(a.date));
      setGroups(groupData);
      setHistory(mergedHistory);
      setSelectedGroupId(groupData[0]?.id ?? null);
      setConnected(true);
      setEmailConfigured(Boolean(health.emailConfigured && health.smtpReachable));
    } catch {
      const savedDemoHistory = JSON.parse(localStorage.getItem('ca-demo-history') || '[]');
      setGroups(fallbackGroups);
      setHistory(savedDemoHistory);
      setSelectedGroupId(fallbackGroups[0].id);
      setConnected(false);
      setEmailConfigured(false);
    } finally {
      setLoading(false);
    }
  }

  function notify(type, message) {
    setToast({ type, message });
  }

  function navigate(nextView) {
    setView(nextView);
    setMobileMenu(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function askConfirm(options) {
    setConfirm(options);
  }

  async function confirmAction() {
    if (!confirm?.onConfirm) return;
    const action = confirm.onConfirm;
    setConfirm(null);
    await action();
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="gmail-mark" aria-hidden="true"><span /></div>
        <strong>Community Announcer</strong>
        <span>Loading workspace…</span>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Header theme={theme} setTheme={setTheme} openMenu={() => setMobileMenu(true)} connected={connected} emailConfigured={emailConfigured} />
      <div className="app-body">
        <Sidebar view={view} navigate={navigate} mobileMenu={mobileMenu} closeMenu={() => setMobileMenu(false)} />
        <main className="main-area">
          {(!connected || !emailConfigured) && (
            <div className="status-banner demo">
              <div className="status-banner-copy">
                <span className="status-dot warning" />
                <div><strong>Demo mode</strong><span>{connected ? 'SMTP is not configured, so Send records the workflow without sending real email.' : 'The API is offline, so the interface is running with demo data and local announcement history.'}</span></div>
              </div>
              <button className="text-button" onClick={loadData}><RefreshCw size={15} /> Retry</button>
            </div>
          )}

          {view === 'announcement' && (
            <AnnouncementPage
              groups={groups}
              history={history}
              selectedGroup={selectedGroup}
              setSelectedGroupId={setSelectedGroupId}
              connected={connected}
              emailConfigured={emailConfigured}
              demoMode={!connected || !emailConfigured}
              setHistory={setHistory}
              notify={notify}
              navigate={navigate}
            />
          )}

          {view === 'groups' && (
            <GroupsPage
              groups={groups}
              setGroups={setGroups}
              selectedGroup={selectedGroup}
              setSelectedGroupId={setSelectedGroupId}
              connected={connected}
              notify={notify}
              askConfirm={askConfirm}
            />
          )}

          {view === 'history' && <HistoryPage history={history} />}

          {view === 'guide' && <GuidePage navigate={navigate} />}
        </main>
      </div>

      {toast && (
        <div className={`toast ${toast.type}`} role="status">
          {toast.type === 'error' ? <X size={17} /> : <CheckCircle2 size={17} />}
          <span>{toast.message}</span>
          <button aria-label="Dismiss" onClick={() => setToast(null)}><X size={15} /></button>
        </div>
      )}

      {confirm && (
        <ConfirmDialog confirm={confirm} cancel={() => setConfirm(null)} proceed={confirmAction} />
      )}
    </div>
  );
}

function Header({ theme, setTheme, openMenu, connected, emailConfigured }) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="icon-button mobile-only" onClick={openMenu} aria-label="Open navigation"><Menu size={20} /></button>
        <div className="brand">
          <div className="gmail-mark" aria-hidden="true"><span /></div>
          <span>Community Announcer</span>
        </div>
        <div className="header-search">
          <Search size={19} />
          <input placeholder="Search mail, groups and history" aria-label="Search" />
        </div>
      </div>
      <div className="topbar-actions">
        <div className={`service-status ${connected ? 'connected' : 'offline'}`} title={emailConfigured ? 'SMTP is configured and reachable' : 'Email service is not configured'}>
          <span />{connected ? (emailConfigured ? 'Mail ready' : 'Demo mode') : 'Demo mode'}
        </div>
        <button className="icon-button" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}>
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>
        <button className="icon-button" title="Notifications"><Bell size={18} /></button>
        <div className="profile-avatar">CA</div>
      </div>
    </header>
  );
}

function Sidebar({ view, navigate, mobileMenu, closeMenu }) {
  return (
    <>
      {mobileMenu && <button className="mobile-overlay" onClick={closeMenu} aria-label="Close navigation" />}
      <aside className={`sidebar ${mobileMenu ? 'open' : ''}`}>
        <div className="sidebar-top">
          <div className="mobile-sidebar-head">
            <strong>Workspace</strong>
            <button className="icon-button" onClick={closeMenu}><X size={18} /></button>
          </div>
          <button className="compose-button" onClick={() => navigate('announcement')}><Edit3 size={17} /> Compose</button>
          <nav className="gmail-nav">
            <NavItem active={view === 'announcement'} icon={<Send size={17} />} label="Announcements" onClick={() => navigate('announcement')} />
            <NavItem active={view === 'groups'} icon={<Users size={17} />} label="Groups & members" onClick={() => navigate('groups')} />
            <NavItem active={view === 'history'} icon={<History size={17} />} label="History" onClick={() => navigate('history')} />
          </nav>
          <div className="nav-divider" />
          <NavItem active={view === 'guide'} icon={<FileText size={17} />} label="How it works" onClick={() => navigate('guide')} />
        </div>
        <div className="sidebar-bottom">
          <div className="storage-row"><ShieldCheck size={16} /><div><strong>Private delivery</strong><span>Each recipient gets an individual email.</span></div></div>
          <div className="account-row"><div className="profile-avatar small">CA</div><div><strong>Community Admin</strong><span>Administrator</span></div><MoreVertical size={17} /></div>
        </div>
      </aside>
    </>
  );
}

function NavItem({ active, icon, label, onClick }) {
  return <button className={`nav-item ${active ? 'active' : ''}`} onClick={onClick}>{icon}<span>{label}</span></button>;
}

function GuidePage({ navigate }) {
  return (
    <div className="page guide-page">
      <div className="page-title-row">
        <div><span className="section-kicker">GETTING STARTED</span><h1>How Community Announcer works</h1><p>A simple private mailing workflow for community updates.</p></div>
      </div>
      <section className="guide-grid">
        {[
          ['01', 'Create a group', 'Make a reusable audience for a class, event, project, club or community.'],
          ['02', 'Add members', 'Store each recipient’s name and email address. Members do not need access to this admin workspace.'],
          ['03', 'Write one announcement', 'Select a group, write the subject and message, and use {{name}} when you want each email personalized.'],
          ['04', 'Send & review', 'The server sends the message privately to each address and records delivery status in History.'],
        ].map(([number, title, text]) => (
          <article className="guide-card" key={number}><span className="guide-number">{number}</span><div><h2>{title}</h2><p>{text}</p></div></article>
        ))}
      </section>
      <section className="guide-callout">
        <ShieldCheck size={22} />
        <div><strong>Important privacy model</strong><span>This is not a WhatsApp-style group chat. The admin manages the recipient list; members are emailed individually and do not see the other recipients.</span></div>
        <button className="blue-button" onClick={() => navigate('announcement')}>Open workspace <ChevronRight size={16} /></button>
      </section>
    </div>
  );
}

function AnnouncementPage({ groups, history, selectedGroup, setSelectedGroupId, connected, emailConfigured, demoMode, setHistory, notify, navigate }) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('Hi {{name}},\n\nWe have an important community update to share with you.\n\nRegards,\nCommunity Team');
  const [sending, setSending] = useState(false);
  const [previewName, setPreviewName] = useState(selectedGroup?.members[0]?.name || 'Member');

  useEffect(() => {
    setPreviewName(selectedGroup?.members[0]?.name || 'Member');
  }, [selectedGroup?.id]);

  const previewMessage = message.replace(/{{\s*name\s*}}/gi, previewName);
  const sentCount = history.reduce((sum, item) => sum + item.recipients.filter((r) => r.status === 'sent' || (demoMode && r.status === 'demo')).length, 0);

  async function sendAnnouncement() {
    if (!selectedGroup || !selectedGroup.members.length || !subject.trim() || !message.trim()) {
      notify('error', 'Select a group with members and complete the subject and message.');
      return;
    }
    setSending(true);
    try {
      if (demoMode) {
        const demoResult = {
          id: `demo-${Date.now()}`,
          group: selectedGroup.name,
          subject: subject.trim(),
          body: message.trim(),
          date: new Date().toISOString(),
          mode: 'demo',
          recipients: selectedGroup.members.map((member) => ({
            name: member.name,
            email: member.email,
            status: 'demo',
          })),
        };
        setHistory((current) => {
          const next = [demoResult, ...current];
          localStorage.setItem('ca-demo-history', JSON.stringify(next.slice(0, 50)));
          return next;
        });
        setSubject('');
        notify('success', `Demo announcement recorded for ${demoResult.recipients.length} recipients. No real email was sent.`);
      } else {
        const result = await apiRequest('/announcements', {
          method: 'POST',
          body: { groupId: selectedGroup.id, subject: subject.trim(), message: message.trim() },
        });
        setHistory((current) => [result, ...current]);
        setSubject('');
        notify('success', `Announcement sent to ${result.recipients.length} recipients.`);
      }
    } catch (error) {
      notify('error', error.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="page">
      <section className="intro-block">
        <div>
          <span className="section-kicker">ANNOUNCEMENT</span>
          <h1>Send an update to your community</h1>
          <p>Choose a private recipient group, write the message, preview it, and send.</p>
        </div>
        <button className="outline-button" onClick={() => navigate('groups')}><Users size={17} /> Manage groups</button>
      </section>

      <section className="metric-strip">
        <Metric label="Groups" value={groups.length} accent="blue" />
        <Metric label="Recipients" value={groups.reduce((sum, g) => sum + g.members.length, 0)} accent="green" />
        <Metric label="Announcements" value={history.length} accent="yellow" />
        <Metric label={demoMode ? "Processed" : "Delivered"} value={sentCount} accent="red" />
      </section>

      <div className="compose-layout">
        <section className="gmail-card compose-card">
          <div className="card-header">
            <div className="card-header-title"><div className="header-icon blue"><Edit3 size={18} /></div><div><strong>New announcement</strong><span>One message · individual delivery</span></div></div>
            <button className="icon-button"><MoreVertical size={18} /></button>
          </div>

          <div className="compose-field recipient-field">
            <label>To</label>
            <select value={selectedGroup?.id ?? ''} onChange={(event) => setSelectedGroupId(event.target.value)}>
              {groups.map((group) => <option key={group.id} value={group.id}>{group.name} ({group.members.length} members)</option>)}
            </select>
          </div>

          <div className="recipient-bar">
            <div className="avatar-stack">
              {selectedGroup?.members.slice(0, 5).map((member) => <span key={member.id} title={member.name}>{initials(member.name)}</span>)}
              {(selectedGroup?.members.length || 0) > 5 && <span>+{selectedGroup.members.length - 5}</span>}
            </div>
            <div><strong>{selectedGroup?.members.length || 0} recipients</strong><span>Recipients are not shown to one another.</span></div>
            <ShieldCheck size={17} />
          </div>

          <div className="compose-field"><label>Subject</label><input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Community meeting this Sunday" /></div>
          <div className="compose-field message-field"><div className="label-row"><label>Message</label><span>Personalize with <code>{'{{name}}'}</code></span></div><textarea value={message} onChange={(event) => setMessage(event.target.value)} spellCheck /></div>
          <div className="compose-toolbar"><span>{message.length} characters</span><button className="text-button" onClick={() => setMessage((current) => `${current.replace(/\n*$/, '')}\n\nRegards,\nCommunity Team`)}>Insert signature</button></div>
          <div className="compose-footer">
            <div><strong>{selectedGroup?.members.length || 0} individual emails</strong><span>{demoMode ? 'Demo mode: the workflow is recorded locally; no email is sent.' : 'SMTP is ready for delivery.'}</span></div>
            <button className="blue-button send-button" disabled={sending || !selectedGroup?.members.length || !subject.trim() || !message.trim()} onClick={sendAnnouncement}><Send size={17} />{sending ? 'Sending…' : 'Send'}</button>
          </div>
        </section>

        <aside className="compose-side">
          <section className="gmail-card preview-card">
            <div className="card-header"><div className="card-header-title"><div className="header-icon green"><Eye size={18} /></div><div><strong>Preview</strong><span>One recipient’s view</span></div></div><span className="small-label">LIVE</span></div>
            <div className="preview-controls"><label>Preview as</label><select value={previewName} onChange={(event) => setPreviewName(event.target.value)}>{(selectedGroup?.members || []).map((member) => <option key={member.id}>{member.name}</option>)}</select></div>
            <div className="mail-preview">
              <div className="mail-preview-top"><div className="profile-avatar">{initials(previewName)}</div><div><strong>Community Team</strong><span>to {previewName}</span></div><time>now</time></div>
              <h3>{subject || 'No subject yet'}</h3>
              <p>{previewMessage}</p>
              <div className="private-note"><ShieldCheck size={14} /> Delivered privately to this recipient</div>
            </div>
          </section>

          <section className="gmail-card activity-card">
            <div className="card-header"><div className="card-header-title"><div className="header-icon yellow"><Clock3 size={18} /></div><div><strong>Recent activity</strong><span>Latest announcements</span></div></div><button className="text-button" onClick={() => navigate('history')}>View all</button></div>
            {history.slice(0, 4).map((item) => <button className="activity-row" key={item.id} onClick={() => navigate('history')}><span className="activity-dot" /><div><strong>{item.subject}</strong><span>{item.group} · {formatDate(item.date)}</span></div><ChevronRight size={16} /></button>)}
            {!history.length && <div className="empty-inline">No announcements have been sent yet.</div>}
          </section>
        </aside>
      </div>
    </div>
  );
}

function Metric({ label, value, accent }) {
  return <div className="metric"><span className={`metric-icon ${accent}`} /> <div><strong>{value}</strong><span>{label}</span></div></div>;
}

function GroupsPage({ groups, setGroups, selectedGroup, setSelectedGroupId, connected, notify, askConfirm }) {
  const [query, setQuery] = useState('');
  const [newGroup, setNewGroup] = useState({ name: '', description: '' });
  const [newMember, setNewMember] = useState({ name: '', email: '' });
  const [draftGroup, setDraftGroup] = useState({ name: '', description: '' });
  const [editingMember, setEditingMember] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (selectedGroup) setDraftGroup({ name: selectedGroup.name, description: selectedGroup.description || '' });
  }, [selectedGroup?.id, selectedGroup?.name, selectedGroup?.description]);

  const filteredGroups = useMemo(() => groups.filter((group) => `${group.name} ${group.description}`.toLowerCase().includes(query.toLowerCase())), [groups, query]);

  async function createGroup(event) {
    event.preventDefault();
    if (!newGroup.name.trim()) return notify('error', 'Enter a group name.');
    if (!connected) return notify('error', 'Start the Node API before creating groups.');
    setSaving(true);
    try {
      const created = await apiRequest('/groups', { method: 'POST', body: newGroup });
      setGroups((current) => [...current, created]);
      setSelectedGroupId(created.id);
      setNewGroup({ name: '', description: '' });
      notify('success', 'Group created.');
    } catch (error) { notify('error', error.message); } finally { setSaving(false); }
  }

  async function saveGroup(event) {
    event.preventDefault();
    if (!selectedGroup || !connected) return notify('error', 'Start the Node API before saving changes.');
    if (!draftGroup.name.trim()) return notify('error', 'Group name cannot be empty.');
    try {
      const updated = await apiRequest(`/groups/${selectedGroup.id}`, { method: 'PUT', body: draftGroup });
      setGroups((current) => current.map((group) => group.id === updated.id ? updated : group));
      notify('success', 'Group details saved.');
    } catch (error) { notify('error', error.message); }
  }

  async function addMember(event) {
    event.preventDefault();
    if (!selectedGroup) return;
    if (!newMember.name.trim() || !newMember.email.trim()) return notify('error', 'Enter both name and email.');
    if (!connected) return notify('error', 'Start the Node API before adding members.');
    try {
      const member = await apiRequest(`/groups/${selectedGroup.id}/members`, { method: 'POST', body: newMember });
      setGroups((current) => current.map((group) => group.id === selectedGroup.id ? { ...group, members: [...group.members, member] } : group));
      setNewMember({ name: '', email: '' });
      notify('success', `${member.name} added to ${selectedGroup.name}.`);
    } catch (error) { notify('error', error.message); }
  }

  async function saveMember(member) {
    if (!connected) return notify('error', 'Start the Node API before editing members.');
    try {
      const updated = await apiRequest(`/members/${member.id}`, { method: 'PUT', body: { name: member.name, email: member.email } });
      setGroups((current) => current.map((group) => group.id === selectedGroup.id ? { ...group, members: group.members.map((item) => item.id === updated.id ? updated : item) } : group));
      setEditingMember(null);
      notify('success', 'Member details saved.');
    } catch (error) { notify('error', error.message); }
  }

  function removeMember(member) {
    askConfirm({
      title: 'Remove member?',
      message: `${member.name} will no longer receive announcements sent to this group.`,
      confirmLabel: 'Remove member',
      danger: true,
      onConfirm: async () => {
        if (!connected) return notify('error', 'Start the Node API before deleting members.');
        try {
          await apiRequest(`/members/${member.id}`, { method: 'DELETE' });
          setGroups((current) => current.map((group) => group.id === selectedGroup.id ? { ...group, members: group.members.filter((item) => item.id !== member.id) } : group));
          notify('success', 'Member removed.');
        } catch (error) { notify('error', error.message); }
      },
    });
  }

  function removeGroup() {
    if (!selectedGroup) return;
    askConfirm({
      title: `Delete “${selectedGroup.name}”?`,
      message: 'This permanently removes the group, its members, and the announcement history associated with it.',
      confirmLabel: 'Delete group',
      danger: true,
      onConfirm: async () => {
        if (!connected) return notify('error', 'Start the Node API before deleting groups.');
        try {
          await apiRequest(`/groups/${selectedGroup.id}`, { method: 'DELETE' });
          const remaining = groups.filter((group) => String(group.id) !== String(selectedGroup.id));
          setGroups(remaining);
          setSelectedGroupId(remaining[0]?.id ?? null);
          notify('success', 'Group deleted permanently.');
        } catch (error) { notify('error', error.message); }
      },
    });
  }

  return (
    <div className="page">
      <section className="intro-block">
        <div><span className="section-kicker">GROUP MANAGEMENT</span><h1>Groups & members</h1><p>Maintain the private recipient lists used by your announcements.</p></div>
        <div className="intro-actions"><span className="privacy-tag"><ShieldCheck size={15} /> Admin only</span></div>
      </section>

      <div className="groups-layout">
        <section className="gmail-card groups-list-card">
          <div className="card-header"><div className="card-header-title"><div className="header-icon blue"><Users size={18} /></div><div><strong>Your groups</strong><span>{groups.length} recipient lists</span></div></div></div>
          <div className="search-field"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search groups" /></div>
          <div className="group-list">
            {filteredGroups.map((group) => (
              <button key={group.id} className={`group-row ${String(group.id) === String(selectedGroup?.id) ? 'selected' : ''}`} onClick={() => setSelectedGroupId(group.id)}>
                <div className="group-avatar">{initials(group.name)}</div>
                <div><strong>{group.name}</strong><span>{group.members.length} members</span></div>
                <ChevronRight size={16} />
              </button>
            ))}
            {!filteredGroups.length && <div className="empty-inline">No groups match your search.</div>}
          </div>
          <form className="new-group-box" onSubmit={createGroup}>
            <div className="subheading"><strong>Create a group</strong><span>Reusable audience</span></div>
            <input value={newGroup.name} onChange={(event) => setNewGroup({ ...newGroup, name: event.target.value })} placeholder="Group name" />
            <input value={newGroup.description} onChange={(event) => setNewGroup({ ...newGroup, description: event.target.value })} placeholder="Description (optional)" />
            <button className="blue-button full" disabled={saving || !connected}><Plus size={17} />{saving ? 'Creating…' : 'Create group'}</button>
          </form>
        </section>

        <section className="gmail-card group-editor-card">
          {!selectedGroup ? <div className="empty-state"><Users size={32} /><strong>No group selected</strong><span>Create a group to start adding recipients.</span></div> : (
            <>
              <div className="editor-top">
                <div className="editor-identity"><div className="large-group-avatar">{initials(selectedGroup.name)}</div><div><span className="section-kicker">SELECTED GROUP</span><h2>{selectedGroup.name}</h2><p>{selectedGroup.members.length} members · {selectedGroup.description || 'No description'}</p></div></div>
                <button className="icon-button danger" onClick={removeGroup} title="Delete group"><Trash2 size={18} /></button>
              </div>

              <form className="group-details-form" onSubmit={saveGroup}>
                <div><label>Group name</label><input value={draftGroup.name} onChange={(event) => setDraftGroup({ ...draftGroup, name: event.target.value })} /></div>
                <div><label>Description</label><input value={draftGroup.description} onChange={(event) => setDraftGroup({ ...draftGroup, description: event.target.value })} /></div>
                <button className="outline-button save-details" disabled={!connected}><Check size={16} /> Save changes</button>
              </form>

              <div className="members-header"><div><strong>Members</strong><span>Private recipients managed by the admin.</span></div><span className="count-badge">{selectedGroup.members.length}</span></div>
              <div className="members-list">
                {selectedGroup.members.map((member) => <MemberEditor key={member.id} member={member} editing={editingMember === member.id} setEditing={setEditingMember} onSave={saveMember} onRemove={removeMember} />)}
                {!selectedGroup.members.length && <div className="empty-inline">This group has no members yet.</div>}
              </div>

              <form className="add-member-box" onSubmit={addMember}>
                <div className="subheading"><strong>Add member</strong><span>They will receive future announcements for this group.</span></div>
                <div className="add-member-grid"><input value={newMember.name} onChange={(event) => setNewMember({ ...newMember, name: event.target.value })} placeholder="Full name" /><input type="email" value={newMember.email} onChange={(event) => setNewMember({ ...newMember, email: event.target.value })} placeholder="name@example.com" /><button className="blue-button" disabled={!connected}><UserPlus size={17} /> Add member</button></div>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function MemberEditor({ member, editing, setEditing, onSave, onRemove }) {
  const [draft, setDraft] = useState(member);
  useEffect(() => setDraft(member), [member]);

  return (
    <div className="member-item">
      <div className="member-main">
        <div className="member-avatar">{initials(member.name)}</div>
        {editing ? <input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /> : <div><strong>{member.name}</strong><span>Recipient</span></div>}
      </div>
      {editing ? <input type="email" value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} /> : <span className="member-email">{member.email}</span>}
      <div className="member-actions">
        {editing ? <><button className="icon-button success" onClick={() => onSave(draft)} title="Save"><Check size={16} /></button><button className="icon-button" onClick={() => setEditing(null)} title="Cancel"><X size={16} /></button></> : <button className="icon-button" onClick={() => setEditing(member.id)} title="Edit member"><Edit3 size={16} /></button>}
        <button className="icon-button danger" onClick={() => onRemove(member)} title="Delete member"><Trash2 size={16} /></button>
      </div>
    </div>
  );
}

function HistoryPage({ history }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(null);
  const filtered = history.filter((item) => `${item.subject} ${item.group} ${item.body}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="page">
      <section className="intro-block"><div><span className="section-kicker">HISTORY</span><h1>Announcement history</h1><p>Review messages sent and the delivery result for every recipient.</p></div></section>
      <section className="gmail-card history-card">
        <div className="history-toolbar"><div className="search-field"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search subject, group or message" /></div><span>{filtered.length} {filtered.length === 1 ? 'announcement' : 'announcements'}</span></div>
        {filtered.map((item) => {
          const delivered = item.recipients.filter((recipient) => recipient.status === 'sent' || recipient.status === 'demo').length;
          return <article className="history-item" key={item.id}>
            <button className="history-summary" onClick={() => setOpen(open === item.id ? null : item.id)}>
              <div className="history-color-bar" />
              <div className="history-subject"><strong>{item.subject}</strong><span>{item.group}</span><p>{item.body}</p></div>
              <div className="history-result"><strong>{delivered}/{item.recipients.length}</strong><span>{item.mode === 'demo' ? 'processed' : 'delivered'}</span></div>
              <ChevronDown className={open === item.id ? 'rotate' : ''} size={18} />
            </button>
            {open === item.id && <div className="history-details">
              <div className="history-message"><span>Message</span><p>{item.body}</p><small>Sent {formatDate(item.date)}</small></div>
              <div className="recipient-detail-list"><span>Recipients</span>{item.recipients.map((recipient) => <div key={`${item.id}-${recipient.email}`}><span className={`status-dot ${recipient.status}`} /><div><strong>{recipient.name}</strong><small>{recipient.email}</small></div><b className={recipient.status === 'sent' ? 'sent' : recipient.status === 'demo' ? 'demo' : 'failed'}>{recipient.status === 'demo' ? 'demo' : recipient.status}</b></div>)}</div>
            </div>}
          </article>;
        })}
        {!filtered.length && <div className="empty-state"><History size={34} /><strong>No announcements found</strong><span>Your sent announcements will appear here.</span></div>}
      </section>
    </div>
  );
}

function ConfirmDialog({ confirm, cancel, proceed }) {
  return (
    <div className="dialog-backdrop" role="presentation">
      <div className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
        <div className={`dialog-icon ${confirm.danger ? 'danger' : 'blue'}`}>{confirm.danger ? <Trash2 size={20} /> : <Archive size={20} />}</div>
        <h2 id="confirm-title">{confirm.title}</h2>
        <p>{confirm.message}</p>
        <div className="dialog-actions"><button className="outline-button" onClick={cancel}>Cancel</button><button className={confirm.danger ? 'danger-button' : 'blue-button'} onClick={proceed}>{confirm.confirmLabel || 'Continue'}</button></div>
      </div>
    </div>
  );
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    method: options.method || 'GET',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'CA';
}

function formatDate(date) {
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(date));
}

createRoot(document.getElementById('root')).render(<App />);
