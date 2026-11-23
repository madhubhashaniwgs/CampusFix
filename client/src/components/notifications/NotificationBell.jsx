import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, CheckCheck } from 'lucide-react';

import apiClient from '../../services/apiClient';
import { onSocketEvent } from '../../services/socketService';
import { useAuth } from '../../context/AuthContext';

const timeAgo = (d) => {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

export default function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  const fetchCount = useCallback(async () => {
    try {
      const res = await apiClient.get('/notifications/unread-count');
      setUnread(res.data?.data?.count ?? 0);
    } catch {
      /* silent */
    }
  }, []);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/notifications', {
        params: { page: 1, limit: 10 },
      });
      setItems(res.data?.data || []);
      setUnread(res.data?.unreadCount ?? 0);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    const timer = setTimeout(fetchCount, 0);
    void timer;
    const offNew = onSocketEvent('notification:new', () => {
      setUnread((c) => c + 1);
      if (open) fetchList();
    });
    const offRead = onSocketEvent('notification:read', (p) => {
      setItems((prev) => prev.map((n) => (n.id === p.id ? { ...n, read: true } : n)));
      setUnread((c) => Math.max(0, c - 1));
    });
    const offAll = onSocketEvent('notification:read_all', () => {
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnread(0);
    });
    const offReconnect = onSocketEvent('socket:reconnected', fetchCount);
    return () => {
      offNew();
      offRead();
      offAll();
      offReconnect();
    };
  }, [user, open, fetchCount, fetchList]);

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const markRead = async (n) => {
    if (!n.read) {
      try {
        await apiClient.patch(`/notifications/${n.id}/read`);
        setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
        setUnread((c) => Math.max(0, c - 1));
      } catch {
        /* silent */
      }
    }
    if (n.issueId) {
      setOpen(false);
      navigate(
        user?.role === 'student'
          ? `/student/issues/${n.issueId}`
          : `/${user?.role}/issues/${n.issueId}`
      );
    }
  };

  const markAll = async () => {
    try {
      await apiClient.patch('/notifications/read-all');
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnread(0);
    } catch {
      /* silent */
    }
  };

  if (!user) return null;

  return (
    <div className="notif-bell" ref={ref}>
      <button
        type="button"
        className="notif-bell-btn"
        onClick={() => {
          setOpen((o) => !o);
          if (!open) fetchList();
        }}
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && <span className="notif-badge">{unread}</span>}
      </button>

      {open && (
        <div className="notif-panel">
          <div className="notif-panel-header">
            <span>Notifications</span>
            {unread > 0 && (
              <button type="button" onClick={markAll} className="notif-markall">
                <CheckCheck className="w-3.5 h-3.5" /> Mark all read
              </button>
            )}
          </div>
          <div className="notif-list">
            {loading ? (
              <div className="notif-empty">Loading…</div>
            ) : items.length === 0 ? (
              <div className="notif-empty">No notifications yet.</div>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  className={`notif-item ${n.read ? 'read' : 'unread'}`}
                  onClick={() => markRead(n)}
                >
                  <div className="notif-item-top">
                    <span className="notif-title">{n.title}</span>
                    {!n.read && <Check className="w-3.5 h-3.5 notif-dot" />}
                  </div>
                  <p className="notif-msg">{n.message}</p>
                  <span className="notif-time">{timeAgo(n.createdAt)}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
