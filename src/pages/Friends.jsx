import React, { useEffect, useState, useRef } from 'react';
import api from '../utils/api';
import useAuthStore from '../store/useAuthStore';
import { io } from 'socket.io-client';
import {
  User,
  Mail,
  Search,
  X,
  Phone,
  Video,
  ShieldCheck,
  ArrowUpRight,
  Paperclip,
  Send,
  FileText,
  CheckCheck,
  Info,
  Loader2,
  MessageSquare,
  ArrowLeft,
  Lock,
  Sparkles,
  Image as ImageIcon,
  MoreVertical,
  Trash2,
  BellOff,
  ShieldAlert,
  Share2,
  UserPlus,
  Edit3,
  Forward,
  Copy,
  Check,
  ChevronDown,
  Ban
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Friends = () => {
  const { user, initialize } = useAuthStore();
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Active Chat & Profile selection state
  const [activeChatFriend, setActiveChatFriend] = useState(null);
  const [selectedFriendProfile, setSelectedFriendProfile] = useState(null);

  // Direct Chat state
  const [chatMessages, setChatMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [attachedFile, setAttachedFile] = useState(null);
  const [sendingMsg, setSendingMsg] = useState(false);
  const [loadingChatHistory, setLoadingChatHistory] = useState(false);

  // Message Actions (Edit, Delete, Forward, Persistent Clear) State
  const [activeMessageMenu, setActiveMessageMenu] = useState(null); // { msgId, msg, isMe, openUpward, style }
  const setActiveMessageMenuId = (val) => {
    if (!val) setActiveMessageMenu(null);
  };
  const activeMessageMenuId = activeMessageMenu?.msgId || null;
  const [editingMessage, setEditingMessage] = useState(null); // { id, originalText }
  const [deleteConfirmMessage, setDeleteConfirmMessage] = useState(null);
  const [isDeletingMsg, setIsDeletingMsg] = useState(false);
  const [forwardModalMessage, setForwardModalMessage] = useState(null);
  const [forwardSearchTerm, setForwardSearchTerm] = useState('');
  const [selectedForwardIds, setSelectedForwardIds] = useState([]);
  const [isForwardingMsg, setIsForwardingMsg] = useState(false);
  const [clearingChat, setClearingChat] = useState(false);
  const [chatToast, setChatToast] = useState(null);

  const showToast = (text) => {
    setChatToast(text);
    setTimeout(() => {
      setChatToast((prev) => (prev === text ? null : prev));
    }, 2600);
  };

  // Real-time metadata maps for left sidebar
  const [lastMessages, setLastMessages] = useState({});
  const [unreadCounts, setUnreadCounts] = useState({});
  const [presenceMap, setPresenceMap] = useState({}); // { [userId]: { isOnline, lastSeen } }

  // Active Chat Header Tools State
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);
  const [showChatSearch, setShowChatSearch] = useState(false);
  const [chatSearchTerm, setChatSearchTerm] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [hoveredCallBtn, setHoveredCallBtn] = useState(null); // 'audio' | 'video' | 'profile-voice' | 'profile-video' | null

  // Add New Friend Modal State
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [searchEmail, setSearchEmail] = useState('');
  const [searchingUser, setSearchingUser] = useState(false);
  const [foundUser, setFoundUser] = useState(null);
  const [searchError, setSearchError] = useState('');

  const fileInputRef = useRef(null);
  const chatInputRef = useRef(null);
  const chatScrollRef = useRef(null);
  const socketRef = useRef(null);
  const activeFriendIdRef = useRef(null);

  const fetchUnreadCounts = async () => {
    try {
      const response = await api.get('/chat/unread-counts');
      if (response.data?.counts) {
        setUnreadCounts(response.data.counts);
      }
    } catch (e) {
      console.error('Error fetching unread counts:', e);
    }
  };

  const fetchRecentChats = async (replace = false) => {
    try {
      const response = await api.get('/chat/recent-chats');
      if (response.data?.recentChats) {
        setLastMessages((prev) =>
          replace
            ? response.data.recentChats
            : { ...prev, ...response.data.recentChats }
        );
      }
    } catch (e) {
      console.error('Error fetching recent chats metadata:', e);
    }
  };

  useEffect(() => {
    initialize();
    fetchFriends();
    fetchUnreadCounts();
    fetchRecentChats();
  }, []);

  const activeFriendId = (activeChatFriend?._id || activeChatFriend?.id)?.toString();
  const currentUserId = (user?._id || user?.id)?.toString();

  // Sync activeFriendId with ref for socket closure freshness
  useEffect(() => {
    activeFriendIdRef.current = activeFriendId;
    if (activeFriendId) {
      // Clear unread count locally & DB when friend chat is opened
      setUnreadCounts((prev) => ({ ...prev, [activeFriendId]: 0 }));
      api.post(`/chat/direct/${activeFriendId}/read`).catch(() => {});
      window.dispatchEvent(new CustomEvent('smartsplit_chat_read_update'));
    }
  }, [activeFriendId]);

  const addOrUpdateMessage = (newMsg, tempIdToRemove = null) => {
    setChatMessages((prev) => {
      if (newMsg._id && prev.some((m) => m._id === newMsg._id)) {
        return tempIdToRemove ? prev.filter((m) => m._id !== tempIdToRemove) : prev;
      }

      if (tempIdToRemove && prev.some((m) => m._id === tempIdToRemove)) {
        return prev.map((m) => (m._id === tempIdToRemove ? newMsg : m));
      }

      const hasMatchingTemp = prev.some((m) => m._id?.startsWith('temp_') && (m.message === newMsg.message || m.text === newMsg.message));
      if (hasMatchingTemp) {
        return prev.map((m) => (m._id?.startsWith('temp_') && (m.message === newMsg.message || m.text === newMsg.message)) ? newMsg : m);
      }

      return [...prev, newMsg];
    });
  };

  // 1. Initialize persistent Socket.io connection when currentUserId is available
  useEffect(() => {
    if (!currentUserId) return;

    const socketUrl = import.meta.env.MODE === 'production'
      ? 'https://smartsplitbackend.vercel.app'
      : (import.meta.env.VITE_API_URL || 'http://localhost:5000');

    if (socketUrl.includes('vercel.app')) return;

    const socket = io(socketUrl, {
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 10000,
    });
    socketRef.current = socket;

    const joinUserRoom = () => {
      if (currentUserId) {
        socket.emit('joinUser', currentUserId);
      }
      if (activeFriendIdRef.current) {
        const directRoomId = [currentUserId, activeFriendIdRef.current].sort().join('_');
        socket.emit('joinGroup', directRoomId);
        socket.emit('joinDirectChat', { userId: currentUserId, recipientId: activeFriendIdRef.current });
      }
    };

    socket.on('connect', () => {
      joinUserRoom();
    });

    if (socket.connected) {
      joinUserRoom();
    }

    socket.on('newMessage', (msg) => {
      const msgSenderId = (msg.senderId?._id || msg.senderId || msg.sender)?.toString();
      const msgRecipientId = (msg.recipientId?._id || msg.recipientId)?.toString();
      const currentActiveId = activeFriendIdRef.current;

      const otherFriendId = msgSenderId === currentUserId ? msgRecipientId : msgSenderId;

      if (otherFriendId) {
        // Ensure this contact is present in the friends list state for live rendering on receiver side
        setFriends((prev) => {
          const exists = prev.some((f) => (f._id || f.id)?.toString() === otherFriendId);
          if (!exists) {
            const senderObj = typeof msg.senderId === 'object' && msg.senderId?._id ? msg.senderId : null;
            const newContact = {
              _id: otherFriendId,
              name: senderObj?.name || msg.senderName || 'SmartSplit Contact',
              email: senderObj?.email || '',
              avatar: senderObj?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(msg.senderName || 'User')}&background=random`,
              mobile: senderObj?.mobile || ''
            };
            return [newContact, ...prev];
          }
          return prev;
        });

        // Update sidebar last message preview & timestamp
        setLastMessages((prev) => ({
          ...prev,
          [otherFriendId]: {
            text: msg.message || msg.text || (msg.mediaUrl ? '📎 Attachment' : ''),
            timestamp: msg.timestamp || new Date().toISOString()
          }
        }));

        // Increment unread count if chat is not currently active for sender
        if (msgSenderId && msgSenderId !== currentUserId && msgSenderId !== currentActiveId) {
          setUnreadCounts((prev) => ({
            ...prev,
            [msgSenderId]: (prev[msgSenderId] || 0) + 1
          }));
          window.dispatchEvent(new CustomEvent('smartsplit_chat_unread_update'));
        }
      }

      // Append to active chat if chat window is open for this contact
      if (currentActiveId) {
        const isFromActiveFriend = msgSenderId === currentActiveId;
        const isFromMeToActiveFriend = msgSenderId === currentUserId && msgRecipientId === currentActiveId;

        if (isFromActiveFriend || isFromMeToActiveFriend) {
          addOrUpdateMessage(msg);
        }
      }
    });

    socket.on('directMessageUpdated', (updatedMsg) => {
      const updatedId = updatedMsg?._id?.toString();
      if (!updatedId) return;
      setChatMessages((prev) => prev.map((m) => ((m._id || m.id)?.toString() === updatedId ? updatedMsg : m)));
      fetchRecentChats(true);
    });

    socket.on('directMessageDeleted', (payload) => {
      if (!payload?.messageId) return;
      if (payload.scope === 'everyone' && payload.updatedMessage) {
        setChatMessages((prev) =>
          prev.map((m) => ((m._id || m.id)?.toString() === payload.messageId ? payload.updatedMessage : m))
        );
      } else {
        setChatMessages((prev) => prev.filter((m) => (m._id || m.id)?.toString() !== payload.messageId));
      }
      fetchRecentChats(true);
    });

    socket.on('directChatCleared', (payload) => {
      const clearedRecipientId = payload?.recipientId?.toString();
      if (!clearedRecipientId) return;
      if (activeFriendIdRef.current === clearedRecipientId) {
        setChatMessages([]);
      }
      setLastMessages((prev) => {
        const next = { ...prev };
        delete next[clearedRecipientId];
        return next;
      });
    });

    socket.on('userPresenceUpdate', (payload) => {
      const uid = payload?.userId?.toString();
      if (!uid) return;
      setPresenceMap((prev) => ({
        ...prev,
        [uid]: {
          isOnline: Boolean(payload.isOnline),
          lastSeen: payload.lastSeen || prev[uid]?.lastSeen || null
        }
      }));
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [currentUserId]);

  // 2. Handle room joining & history fetch when activeChatFriend changes
  useEffect(() => {
    setActiveMessageMenuId(null);
    setEditingMessage(null);
    setDeleteConfirmMessage(null);
    setForwardModalMessage(null);

    if (activeFriendId && currentUserId) {
      fetchDirectChatHistory(activeFriendId);

      if (socketRef.current) {
        const directRoomId = [currentUserId, activeFriendId].sort().join('_');
        socketRef.current.emit('joinGroup', directRoomId);
        socketRef.current.emit('joinDirectChat', { userId: currentUserId, recipientId: activeFriendId });
      }
    } else {
      setChatMessages([]);
      setAttachedFile(null);
      setInputMessage('');
    }
  }, [activeFriendId, currentUserId]);

  // Broadcast active chat state for mobile layout (hide bottom nav during direct chat)
  useEffect(() => {
    if (activeChatFriend) {
      window.dispatchEvent(new CustomEvent('smartsplit_toggle_bottom_nav', { detail: { hide: true } }));
    } else {
      window.dispatchEvent(new CustomEvent('smartsplit_toggle_bottom_nav', { detail: { hide: false } }));
    }
    return () => {
      window.dispatchEvent(new CustomEvent('smartsplit_toggle_bottom_nav', { detail: { hide: false } }));
    };
  }, [activeChatFriend]);

  // Auto-scroll chat to bottom when messages update
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, activeFriendId]);

  // Handle URL activeChat query parameter (e.g., /friends?activeChat=65a123...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const targetChatId = params.get('activeChat');

    if (targetChatId) {
      if (Array.isArray(friends) && friends.length > 0) {
        const match = friends.find((f) => (f._id || f.id)?.toString() === targetChatId);
        if (match) {
          setActiveChatFriend(match);
        } else {
          api.get(`/auth/search-user?userId=${targetChatId}`).then((res) => {
            if (res.data?.user) {
              setFriends((prev) => [res.data.user, ...prev]);
              setActiveChatFriend(res.data.user);
            }
          }).catch(() => {});
        }
      } else {
        api.get(`/auth/search-user?userId=${targetChatId}`).then((res) => {
          if (res.data?.user) {
            setFriends((prev) => [res.data.user, ...prev]);
            setActiveChatFriend(res.data.user);
          }
        }).catch(() => {});
      }
    }
  }, [friends.length]);

  const fetchFriends = async () => {
    try {
      const response = await api.get('/groups/friends');
      const list = Array.isArray(response.data) ? response.data : [];
      setFriends(list);

      const nextPresence = {};
      list.forEach((f) => {
        const fId = (f._id || f.id)?.toString();
        if (fId) {
          nextPresence[fId] = {
            isOnline: Boolean(f.isOnline),
            lastSeen: f.lastSeen || f.updatedAt || f.createdAt || null
          };
        }
      });
      setPresenceMap((prev) => ({ ...nextPresence, ...prev }));
    } catch (error) {
      console.error('Error fetching friends:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDirectChatHistory = async (recipientId) => {
    if (!recipientId) return;
    setLoadingChatHistory(true);
    try {
      const response = await api.get(`/chat/direct/${recipientId}`);
      if (Array.isArray(response.data)) {
        setChatMessages(response.data);
        if (response.data.length > 0) {
          const lastMsg = response.data[response.data.length - 1];
          setLastMessages((prev) => ({
            ...prev,
            [recipientId]: {
              text: lastMsg.message || lastMsg.text || (lastMsg.mediaUrl ? '📎 Attachment' : ''),
              timestamp: lastMsg.timestamp || new Date().toISOString()
            }
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching direct chat history:', error);
    } finally {
      setLoadingChatHistory(false);
    }
  };

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    const trimmedText = inputMessage.trim();

    // Handle Edit Mode submission
    if (editingMessage) {
      if (!trimmedText) return;
      setSendingMsg(true);
      try {
        const res = await api.patch(`/chat/direct/message/${editingMessage.id}`, {
          message: trimmedText
        });
        if (res.data?._id) {
          setChatMessages((prev) =>
            prev.map((m) => ((m._id || m.id)?.toString() === editingMessage.id ? res.data : m))
          );
          fetchRecentChats(true);
          showToast('Message updated');
        }
        setEditingMessage(null);
        setInputMessage('');
      } catch (err) {
        console.error('Failed to edit message:', err);
        alert(err.response?.data?.message || 'Failed to update message.');
      } finally {
        setSendingMsg(false);
      }
      return;
    }

    if (!trimmedText && !attachedFile) return;
    if (!activeFriendId || !currentUserId) return;

    setSendingMsg(true);
    const textToSend = trimmedText;
    const tempId = `temp_${Date.now()}`;

    // 1. Create optimistic message for instant UI responsiveness
    const optimisticMsg = {
      _id: tempId,
      senderId: currentUserId,
      sender: 'me',
      senderName: user?.name || 'Me',
      message: textToSend,
      text: textToSend,
      messageType: attachedFile ? attachedFile.type : 'text',
      mediaUrl: attachedFile?.url || null,
      fileName: attachedFile?.name || null,
      fileSize: attachedFile?.rawFile?.size || null,
      timestamp: new Date().toISOString()
    };

    // Append to UI immediately
    setChatMessages((prev) => [...prev, optimisticMsg]);
    setLastMessages((prev) => ({
      ...prev,
      [activeFriendId]: {
        text: textToSend || (attachedFile ? '📎 Attachment' : ''),
        timestamp: optimisticMsg.timestamp
      }
    }));

    setInputMessage('');
    const fileToUpload = attachedFile;
    setAttachedFile(null);

    try {
      let mediaUrl = null;
      let mediaPublicId = null;
      let fileName = null;
      let fileSize = null;
      let msgType = 'text';

      // Upload File if attached
      if (fileToUpload?.rawFile) {
        const formData = new FormData();
        formData.append('file', fileToUpload.rawFile);

        const uploadRes = await api.post(`/chat/direct/upload/${activeFriendId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        mediaUrl = uploadRes.data.mediaUrl;
        mediaPublicId = uploadRes.data.mediaPublicId;
        fileName = uploadRes.data.fileName;
        fileSize = uploadRes.data.fileSize;
        msgType = fileToUpload.type;
      }

      // Post Message to Backend
      const response = await api.post(`/chat/direct/${activeFriendId}`, {
        message: textToSend,
        messageType: msgType,
        mediaUrl,
        mediaPublicId,
        fileName,
        fileSize
      });

      // Replace temp message with server response message
      if (response.data && response.data._id) {
        addOrUpdateMessage(response.data, tempId);
      }
    } catch (error) {
      console.warn('Backend API request notice, message kept in chat session:', error);
    } finally {
      setSendingMsg(false);
    }
  };

  // Persistent Clear Chat (survives page refresh)
  const handleClearChat = async () => {
    if (!activeFriendId || clearingChat) return;
    if (!window.confirm(`Clear all chat history with ${activeChatFriend?.name || 'this contact'}? This cannot be undone.`)) {
      return;
    }

    setClearingChat(true);
    try {
      await api.delete(`/chat/direct/${activeFriendId}/clear`);
      setChatMessages([]);
      setEditingMessage(null);
      setActiveMessageMenuId(null);
      setLastMessages((prev) => {
        const next = { ...prev };
        delete next[activeFriendId];
        return next;
      });
      setUnreadCounts((prev) => ({ ...prev, [activeFriendId]: 0 }));
      showToast('Chat cleared permanently');
    } catch (err) {
      console.error('Error clearing chat:', err);
      alert(err.response?.data?.message || 'Failed to clear chat. Please try again.');
    } finally {
      setClearingChat(false);
    }
  };

  const handleStartEditMessage = (msg) => {
    const msgId = (msg._id || msg.id)?.toString();
    if (!msgId) return;
    setEditingMessage({
      id: msgId,
      originalText: msg.message || msg.text || ''
    });
    setInputMessage(msg.message || msg.text || '');
    setAttachedFile(null);
    setActiveMessageMenuId(null);
    setTimeout(() => chatInputRef.current?.focus(), 50);
  };

  const handleDeleteMessage = async (scope) => {
    if (!deleteConfirmMessage || isDeletingMsg) return;
    const msgId = (deleteConfirmMessage._id || deleteConfirmMessage.id)?.toString();
    if (!msgId) return;

    // Handle unsent local temp messages
    if (msgId.startsWith('temp_')) {
      setChatMessages((prev) => prev.filter((m) => (m._id || m.id)?.toString() !== msgId));
      setDeleteConfirmMessage(null);
      return;
    }

    setIsDeletingMsg(true);
    try {
      const res = await api.delete(`/chat/direct/message/${msgId}?scope=${scope}`);
      if (scope === 'everyone' && res.data?.message) {
        setChatMessages((prev) =>
          prev.map((m) => ((m._id || m.id)?.toString() === msgId ? res.data.message : m))
        );
      } else {
        setChatMessages((prev) => prev.filter((m) => (m._id || m.id)?.toString() !== msgId));
      }
      if (editingMessage?.id === msgId) {
        setEditingMessage(null);
        setInputMessage('');
      }
      fetchRecentChats(true);
      setDeleteConfirmMessage(null);
      showToast(scope === 'everyone' ? 'Deleted for everyone' : 'Deleted for you');
    } catch (err) {
      console.error('Failed to delete message:', err);
      const msg =
        err.response?.status === 404
          ? 'Delete endpoint not active yet (404). Please restart the Backend server.'
          : err.response?.data?.message || 'Failed to delete message.';
      alert(msg);
    } finally {
      setIsDeletingMsg(false);
    }
  };

  const handleOpenForwardModal = (msg) => {
    setForwardModalMessage(msg);
    setForwardSearchTerm('');
    setSelectedForwardIds([]);
    setActiveMessageMenuId(null);
  };

  const handleToggleMessageMenu = (e, msg, isMe) => {
    e.stopPropagation();
    const msgId = (msg._id || msg.id || '').toString();
    if (activeMessageMenu?.msgId === msgId) {
      setActiveMessageMenu(null);
      return;
    }

    const btnRect = e.currentTarget.getBoundingClientRect();
    const containerRect = chatScrollRef.current?.getBoundingClientRect();
    const bottomLimit = containerRect ? Math.min(containerRect.bottom, window.innerHeight) : window.innerHeight;
    const spaceBelow = bottomLimit - btnRect.bottom;
    const openUpward = spaceBelow < 185;
    const menuWidth = 164;

    const style = {
      width: `${menuWidth}px`,
      ...(openUpward
        ? { bottom: `${Math.max(12, window.innerHeight - btnRect.top + 6)}px` }
        : { top: `${btnRect.bottom + 6}px` }),
      ...(isMe
        ? { right: `${Math.max(12, window.innerWidth - btnRect.right)}px` }
        : { left: `${Math.max(12, Math.min(btnRect.left, window.innerWidth - menuWidth - 12))}px` })
    };

    setActiveMessageMenu({ msgId, msg, isMe, openUpward, style });
  };

  const handleToggleForwardRecipient = (targetId) => {
    setSelectedForwardIds((prev) =>
      prev.includes(targetId) ? prev.filter((id) => id !== targetId) : [...prev, targetId]
    );
  };

  const handleConfirmForward = async () => {
    if (!forwardModalMessage || selectedForwardIds.length === 0 || isForwardingMsg) return;
    const msgId = (forwardModalMessage._id || forwardModalMessage.id)?.toString();
    const isTemp = !msgId || msgId.startsWith('temp_');

    setIsForwardingMsg(true);
    try {
      const payload = isTemp
        ? {
            recipientIds: selectedForwardIds,
            message: forwardModalMessage.message || forwardModalMessage.text || '',
            messageType: forwardModalMessage.messageType || 'text',
            mediaUrl: forwardModalMessage.mediaUrl,
            fileName: forwardModalMessage.fileName,
            fileSize: forwardModalMessage.fileSize
          }
        : {
            messageId: msgId,
            recipientIds: selectedForwardIds
          };

      const res = await api.post('/chat/direct/forward', payload);
      const forwardedList = res.data?.forwardedMessages || [];

      forwardedList.forEach((fwdMsg) => {
        const recId = (fwdMsg.recipientId?._id || fwdMsg.recipientId)?.toString();
        if (recId) {
          setLastMessages((prev) => ({
            ...prev,
            [recId]: {
              text: fwdMsg.message || (fwdMsg.mediaUrl ? '📎 Attachment' : ''),
              timestamp: fwdMsg.timestamp || new Date().toISOString()
            }
          }));
          if (recId === activeFriendId) {
            addOrUpdateMessage(fwdMsg);
          }
        }
      });

      const count = selectedForwardIds.length;
      setForwardModalMessage(null);
      setSelectedForwardIds([]);
      showToast(`Forwarded to ${count} ${count === 1 ? 'contact' : 'contacts'}`);
    } catch (err) {
      console.error('Failed to forward message:', err);
      alert(err.response?.data?.message || 'Failed to forward message.');
    } finally {
      setIsForwardingMsg(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setAttachedFile({
        rawFile: file,
        name: file.name,
        type: file.type.startsWith('image/') ? 'image' : 'file',
        url: event.target.result,
        size: (file.size / 1024).toFixed(1) + ' KB'
      });
    };
    reader.readAsDataURL(file);
  };

  const getCalendarDayDiff = (date) => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const targetStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    return Math.round((todayStart - targetStart) / (1000 * 60 * 60 * 24));
  };

  const getCalendarDayKey = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '';
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const formatDDMMYYYY = (date) => {
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  // WhatsApp-style date pill label inside chat history
  const formatChatDateDivider = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '';
    const diffDays = getCalendarDayDiff(date);

    if (diffDays <= 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays >= 2 && diffDays <= 6) {
      return date.toLocaleDateString('en-US', { weekday: 'long' });
    }
    return formatDDMMYYYY(date);
  };

  // WhatsApp-style sidebar last message timestamp
  const formatMessageTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '';
    const diffDays = getCalendarDayDiff(date);

    if (diffDays <= 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (diffDays === 1) return 'Yesterday';
    if (diffDays >= 2 && diffDays <= 6) {
      return date.toLocaleDateString('en-US', { weekday: 'long' });
    }
    return formatDDMMYYYY(date);
  };

  // WhatsApp-style Online / Last Seen presence formatter (never displays bare "Offline")
  const getContactPresence = (friendObj) => {
    const fId = (friendObj?._id || friendObj?.id)?.toString();
    const live = fId ? presenceMap[fId] : null;
    const isOnline = live ? live.isOnline : Boolean(friendObj?.isOnline);
    const rawLastSeen = live?.lastSeen || friendObj?.lastSeen || friendObj?.updatedAt || friendObj?.createdAt;

    if (isOnline) {
      return { isOnline: true, label: 'Online' };
    }
    if (!rawLastSeen) {
      return { isOnline: false, label: 'last seen recently' };
    }

    const lsDate = new Date(rawLastSeen);
    if (isNaN(lsDate.getTime())) {
      return { isOnline: false, label: 'last seen recently' };
    }

    const diffDays = getCalendarDayDiff(lsDate);
    const timePart = lsDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (diffDays <= 0) {
      return { isOnline: false, label: `last seen today at ${timePart}` };
    }
    if (diffDays === 1) {
      return { isOnline: false, label: `last seen yesterday at ${timePart}` };
    }
    if (diffDays >= 2 && diffDays <= 6) {
      const weekday = lsDate.toLocaleDateString('en-US', { weekday: 'long' });
      return { isOnline: false, label: `last seen ${weekday} at ${timePart}` };
    }
    return { isOnline: false, label: `last seen ${formatDDMMYYYY(lsDate)} at ${timePart}` };
  };

  // Sort friends by most recent message timestamp (descending - WhatsApp style)
  const sortedFriends = Array.isArray(friends) ? [...friends].sort((a, b) => {
    const idA = (a._id || a.id)?.toString();
    const idB = (b._id || b.id)?.toString();

    const timeA = lastMessages[idA]?.timestamp ? new Date(lastMessages[idA].timestamp).getTime() : 0;
    const timeB = lastMessages[idB]?.timestamp ? new Date(lastMessages[idB].timestamp).getTime() : 0;

    if (timeA !== timeB) {
      return timeB - timeA; // Most recent message first
    }
    return (a.name || '').localeCompare(b.name || '');
  }) : [];

  const filteredFriends = sortedFriends.filter(friend => {
    if (!friend) return false;
    const name = friend.name || '';
    const email = friend.email || '';
    const mobile = friend.mobile || '';
    const query = searchTerm.toLowerCase();
    return name.toLowerCase().includes(query) ||
      email.toLowerCase().includes(query) ||
      mobile.toLowerCase().includes(query);
  });

  // Search existing user in MongoDB by Email
  const handleSearchUserByEmail = async (e) => {
    if (e) e.preventDefault();
    if (!searchEmail.trim()) return;

    setSearchingUser(true);
    setSearchError('');
    setFoundUser(null);

    try {
      const res = await api.get(`/auth/search-user?email=${encodeURIComponent(searchEmail.trim())}`);
      if (res.data?.exists && res.data?.user) {
        setFoundUser(res.data.user);
      } else {
        setSearchError('No registered user found with this email address.');
      }
    } catch (error) {
      console.error('Error searching user:', error);
      setSearchError(error.response?.data?.message || 'No registered user found with this email address.');
    } finally {
      setSearchingUser(false);
    }
  };

  // Start chat with found user and add to sidebar contacts
  const handleStartChatWithFoundUser = (targetUser) => {
    if (!targetUser) return;

    const targetId = (targetUser._id || targetUser.id)?.toString();

    // Ensure target user is in friends state list
    setFriends((prev) => {
      const exists = prev.some((f) => (f._id || f.id)?.toString() === targetId);
      if (!exists) {
        return [targetUser, ...prev];
      }
      return prev;
    });

    // Set active chat friend
    setActiveChatFriend(targetUser);

    // Close modal & reset fields
    setShowAddFriendModal(false);
    setSearchEmail('');
    setFoundUser(null);
    setSearchError('');
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* WhatsApp Web Style Main 2-Column Container */}
      <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden ${
        activeChatFriend 
          ? 'h-[calc(100vh-5rem)] sm:h-[calc(100vh-5.5rem)] md:h-[calc(100vh-6.2rem)] min-h-[460px]' 
          : 'h-[calc(100vh-10rem)] sm:h-[calc(100vh-10.5rem)] md:h-[calc(100vh-6.2rem)] min-h-[500px]'
      } flex transition-all duration-200`}>

        {/* LEFT COLUMN: CONTACTS SIDEBAR */}
        <div className={`w-full md:w-80 lg:w-96 border-r border-slate-200/80 dark:border-slate-800 flex flex-col bg-slate-50/70 dark:bg-slate-950/50 shrink-0 min-h-0 ${activeChatFriend ? 'hidden md:flex' : 'flex'
          }`}>
          {/* Sidebar Header - Fixed h-16 for exact straight horizontal line alignment */}
          <div className="h-16 px-4 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 rounded-xl">
                <MessageSquare size={20} />
              </div>
              <div>
                <h2 className="font-black text-lg text-slate-900 dark:text-white tracking-tight">Chats</h2>
                <p className="text-[11px] font-bold text-slate-400">{filteredFriends.length} Contacts</p>
              </div>
            </div>

            {/* Add New Friend Button */}
            <button
              onClick={() => {
                setShowAddFriendModal(true);
                setSearchEmail('');
                setFoundUser(null);
                setSearchError('');
              }}
              title="Add New Friend by Email"
              className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl shadow-xs transition-all active:scale-95 flex items-center gap-1.5 text-xs font-bold shrink-0"
            >
              <UserPlus size={16} />
              <span className="hidden sm:inline">Add Friend</span>
            </button>
          </div>

          {/* Sidebar Search Input */}
          <div className="p-3 bg-white/50 dark:bg-slate-900/50 border-b border-slate-200/60 dark:border-slate-800/60">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search or start new chat..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 rounded-xl text-xs font-medium text-slate-800 dark:text-white outline-none focus:border-primary-500 transition-all placeholder:text-slate-400"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Scrollable Friends Contact List */}
          <div className="flex-1 overflow-y-auto no-scrollbar divide-y divide-slate-100 dark:divide-slate-800/40">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3">
                <Loader2 size={24} className="animate-spin text-primary-600" />
                <p className="text-xs font-bold text-slate-400">Loading Contacts...</p>
              </div>
            ) : filteredFriends.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                <User size={32} className="mx-auto mb-2 opacity-50" />
                <p className="font-bold">No contacts found</p>
              </div>
            ) : (
              filteredFriends.map((friend) => {
                const friendId = (friend._id || friend.id)?.toString();
                const isSelected = activeFriendId === friendId;
                const lastMsg = lastMessages[friendId];
                const unreadCount = unreadCounts[friendId] || 0;
                const timeString = formatMessageTime(lastMsg?.timestamp);
                const friendPresence = getContactPresence(friend);

                return (
                  <div
                    key={friendId}
                    onClick={() => setActiveChatFriend(friend)}
                    className={`flex items-center gap-3.5 p-3.5 cursor-pointer transition-all relative group ${isSelected
                        ? 'bg-primary-50/90 dark:bg-primary-950/70 border-l-4 border-primary-600'
                        : 'hover:bg-white dark:hover:bg-slate-900/80'
                      }`}
                  >
                    {/* Contact Avatar */}
                    <div className="relative shrink-0">
                      <img
                        src={friend.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(friend.name || 'User')}&background=random`}
                        alt={friend.name}
                        className="w-12 h-12 rounded-2xl object-cover border border-slate-200/80 dark:border-slate-700 shadow-xs"
                      />
                      {friendPresence.isOnline && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 ring-2 ring-white dark:ring-slate-950 rounded-full" title="Online" />
                      )}
                    </div>

                    {/* Contact Name & Last Message */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <h4 className={`font-extrabold text-sm truncate ${isSelected ? 'text-primary-700 dark:text-primary-300' : 'text-slate-800 dark:text-slate-100'
                          }`}>
                          {friend.name || 'Unknown User'}
                        </h4>
                        {timeString && (
                          <span className="text-[10px] font-bold text-slate-400 shrink-0 ml-2">
                            {timeString}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs text-slate-400 dark:text-slate-500 truncate font-medium">
                          {lastMsg?.text || friend.email || 'SmartSplit Contact'}
                        </p>
                        {unreadCount > 0 && (
                          <span className="px-1.5 py-0.5 bg-emerald-500 text-white text-[10px] font-extrabold rounded-full shrink-0 shadow-xs">
                            {unreadCount}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quick Profile View Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFriendProfile(friend);
                      }}
                      title="View Member Profile"
                      className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-primary-600 rounded-xl transition-all shrink-0"
                    >
                      <ArrowUpRight size={15} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: ACTIVE DIRECT CHAT WORKSPACE */}
        <div className={`flex-1 flex flex-col bg-slate-100 dark:bg-slate-950 relative min-h-0 overflow-hidden ${activeChatFriend ? 'flex' : 'hidden md:flex'
          }`}>
          {activeChatFriend ? (
            <>
              {/* WhatsApp Active Chat Header - Fixed h-16 for exact straight horizontal line alignment */}
              <div className="h-16 px-2.5 sm:px-4 bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between shrink-0 gap-1 sm:gap-3">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  {/* Back button for mobile screens */}
                  <button
                    onClick={() => setActiveChatFriend(null)}
                    className="p-1 sm:p-1.5 md:hidden text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl shrink-0"
                  >
                    <ArrowLeft size={18} />
                  </button>

                  {/* Header Profile Click */}
                  {(() => {
                    const activePresence = getContactPresence(activeChatFriend);
                    return (
                      <div
                        onClick={() => setSelectedFriendProfile(activeChatFriend)}
                        className="flex items-center gap-2 sm:gap-3 cursor-pointer group min-w-0"
                        title="Click to view member profile"
                      >
                        <div className="relative shrink-0">
                          <img
                            src={activeChatFriend.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(activeChatFriend.name || 'User')}&background=random`}
                            alt={activeChatFriend.name}
                            className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 group-hover:scale-105 transition-transform"
                          />
                          {activePresence.isOnline && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-emerald-500 ring-2 ring-white dark:ring-slate-900 rounded-full" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <h3 className="font-extrabold text-xs sm:text-base text-slate-800 dark:text-white group-hover:text-primary-600 transition-colors truncate max-w-[140px] xs:max-w-[180px] sm:max-w-none">
                            {activeChatFriend.name || 'Unknown User'}
                          </h3>
                          <p className={`text-[10px] sm:text-[11px] font-medium truncate max-w-[160px] xs:max-w-[200px] sm:max-w-none ${
                            activePresence.isOnline
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-slate-400'
                          }`}>
                            {activePresence.label}
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* WhatsApp Web Header Action Tools Bar */}
                <div className="flex items-center gap-0.5 sm:gap-1.5 relative shrink-0">
                  {/* Disabled Audio Call Button */}
                  <div className="relative flex items-center">
                    <button
                      disabled
                      onMouseEnter={() => setHoveredCallBtn('audio')}
                      onMouseLeave={() => setHoveredCallBtn(null)}
                      className="hidden sm:inline-flex p-1.5 sm:p-2 text-slate-400 dark:text-slate-500 bg-slate-100/80 dark:bg-slate-800/60 rounded-full cursor-not-allowed opacity-60 transition-all border border-slate-200/50 dark:border-slate-800"
                      aria-label="Audio Call (Upcoming Feature)"
                    >
                      <Phone size={17} />
                    </button>

                    <AnimatePresence>
                      {hoveredCallBtn === 'audio' && (
                        <motion.div
                          initial={{ opacity: 0, y: 6, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 6, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          className="absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap z-50 pointer-events-none"
                        >
                          <div className="bg-slate-900/95 dark:bg-slate-950/95 text-white backdrop-blur-md border border-slate-700/80 shadow-2xl rounded-xl px-3 py-1.5 text-[11px] font-bold flex items-center gap-2">
                            <Sparkles size={13} className="text-amber-400 animate-pulse shrink-0" />
                            <span>Audio Call</span>
                            <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 text-[9px] font-extrabold rounded-md uppercase tracking-wider border border-amber-500/30">
                              Upcoming Feature
                            </span>
                          </div>
                          <div className="w-2 h-2 bg-slate-900/95 dark:bg-slate-950/95 rotate-45 absolute -top-1 left-1/2 -translate-x-1/2 border-t border-l border-slate-700/80" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Disabled Video Call Button */}
                  <div className="relative flex items-center">
                    <button
                      disabled
                      onMouseEnter={() => setHoveredCallBtn('video')}
                      onMouseLeave={() => setHoveredCallBtn(null)}
                      className="hidden sm:inline-flex p-1.5 sm:p-2 text-slate-400 dark:text-slate-500 bg-slate-100/80 dark:bg-slate-800/60 rounded-full cursor-not-allowed opacity-60 transition-all border border-slate-200/50 dark:border-slate-800"
                      aria-label="Video Call (Upcoming Feature)"
                    >
                      <Video size={17} />
                    </button>

                    <AnimatePresence>
                      {hoveredCallBtn === 'video' && (
                        <motion.div
                          initial={{ opacity: 0, y: 6, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 6, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          className="absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap z-50 pointer-events-none"
                        >
                          <div className="bg-slate-900/95 dark:bg-slate-950/95 text-white backdrop-blur-md border border-slate-700/80 shadow-2xl rounded-xl px-3 py-1.5 text-[11px] font-bold flex items-center gap-2">
                            <Sparkles size={13} className="text-amber-400 animate-pulse shrink-0" />
                            <span>Video Call</span>
                            <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 text-[9px] font-extrabold rounded-md uppercase tracking-wider border border-amber-500/30">
                              Upcoming Feature
                            </span>
                          </div>
                          <div className="w-2 h-2 bg-slate-900/95 dark:bg-slate-950/95 rotate-45 absolute -top-1 left-1/2 -translate-x-1/2 border-t border-l border-slate-700/80" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Search Button */}
                  <button
                    onClick={() => {
                      setShowChatSearch(prev => !prev);
                      if (showChatSearch) setChatSearchTerm('');
                    }}
                    title="Search Messages"
                    className={`p-2 rounded-full transition-colors ${showChatSearch
                        ? 'bg-primary-50 dark:bg-primary-950 text-primary-600 dark:text-primary-400'
                        : 'text-slate-500 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                  >
                    <Search size={18} />
                  </button>

                  {/* Three-Dots Menu Button */}
                  <div className="relative">
                    <button
                      onClick={() => setShowMenuDropdown(prev => !prev)}
                      title="Menu Options"
                      className={`p-2 rounded-full transition-colors ${showMenuDropdown
                          ? 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-white'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                    >
                      <MoreVertical size={18} />
                    </button>

                    {/* Three-Dots Dropdown Menu */}
                    <AnimatePresence>
                      {showMenuDropdown && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setShowMenuDropdown(false)}
                          />
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -5 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -5 }}
                            transition={{ duration: 0.15 }}
                            className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-800 py-1.5 z-50 overflow-hidden"
                          >
                            <button
                              onClick={() => {
                                setSelectedFriendProfile(activeChatFriend);
                                setShowMenuDropdown(false);
                              }}
                              className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 transition-colors"
                            >
                              <Info size={15} className="text-primary-500" />
                              <span>Contact info</span>
                            </button>

                            <button
                              onClick={() => {
                                setShowChatSearch(true);
                                setShowMenuDropdown(false);
                              }}
                              className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 transition-colors"
                            >
                              <Search size={15} className="text-primary-500" />
                              <span>Search messages</span>
                            </button>

                            <button
                              onClick={() => {
                                setIsMuted(prev => !prev);
                                setShowMenuDropdown(false);
                              }}
                              className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 transition-colors"
                            >
                              <BellOff size={15} className="text-amber-500" />
                              <span>{isMuted ? 'Unmute notifications' : 'Mute notifications'}</span>
                            </button>

                            <hr className="my-1 border-slate-100 dark:border-slate-800" />

                            <button
                              onClick={() => {
                                setShowMenuDropdown(false);
                                handleClearChat();
                              }}
                              disabled={clearingChat}
                              className="w-full px-4 py-2.5 text-left text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2.5 transition-colors disabled:opacity-50"
                            >
                              {clearingChat ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                              <span>{clearingChat ? 'Clearing...' : 'Clear chat'}</span>
                            </button>

                            <button
                              onClick={() => {
                                setShowMenuDropdown(false);
                                alert(`Reported ${activeChatFriend.name || 'user'} to SmartSplit Enterprise Security.`);
                              }}
                              className="w-full px-4 py-2.5 text-left text-xs font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 transition-colors"
                            >
                              <ShieldAlert size={15} />
                              <span>Report contact</span>
                            </button>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* Premium WhatsApp Web In-Chat Search Bar */}
              <AnimatePresence>
                {showChatSearch && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="px-4 py-2.5 bg-slate-50/90 dark:bg-slate-900/90 border-b border-slate-200/80 dark:border-slate-800 shrink-0 shadow-2xs backdrop-blur-sm"
                  >
                    <div className="relative flex items-center bg-white dark:bg-slate-800 rounded-2xl px-4 py-2 border border-slate-200/90 dark:border-slate-700/80 shadow-sm focus-within:ring-2 focus-within:ring-primary-500/20 focus-within:border-primary-500 transition-all">
                      <Search size={16} className="text-slate-400 shrink-0 mr-3" />
                      <input
                        type="text"
                        placeholder="Search messages in this conversation..."
                        value={chatSearchTerm}
                        onChange={(e) => setChatSearchTerm(e.target.value)}
                        autoFocus
                        style={{ outline: 'none', boxShadow: 'none' }}
                        className="w-full bg-transparent text-xs font-semibold text-slate-800 dark:text-white outline-none focus:outline-none focus:ring-0 border-none p-0 placeholder:text-slate-400 placeholder:font-medium"
                      />

                      {chatSearchTerm && (
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <span className="px-2 py-0.5 bg-primary-50 dark:bg-primary-950 text-primary-600 dark:text-primary-400 text-[10px] font-extrabold rounded-full">
                            {chatMessages.filter(m => (m.message || m.text || '').toLowerCase().includes(chatSearchTerm.toLowerCase())).length} found
                          </span>
                          <button
                            onClick={() => setChatSearchTerm('')}
                            className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                          >
                            Clear
                          </button>
                        </div>
                      )}

                      <button
                        onClick={() => {
                          setShowChatSearch(false);
                          setChatSearchTerm('');
                        }}
                        className="p-1 ml-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        title="Close Search"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Chat Message Scrollable Body */}
              <div
                ref={chatScrollRef}
                onScroll={() => activeMessageMenu && setActiveMessageMenu(null)}
                onClick={() => activeMessageMenu && setActiveMessageMenu(null)}
                className="flex-1 p-4 sm:p-6 overflow-y-auto no-scrollbar space-y-4 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]"
              >
                <div className="flex justify-center my-1">
                  <span className="px-3 py-1 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm text-[11px] font-bold text-slate-400 dark:text-slate-500 rounded-full border border-slate-200/60 dark:border-slate-800 shadow-2xs flex items-center gap-1.5">
                    <Lock size={11} className="text-emerald-500" /> Real-Time Direct Encrypted Chat
                  </span>
                </div>

                {loadingChatHistory ? (
                  <div className="flex justify-center items-center py-16">
                    <Loader2 size={24} className="animate-spin text-primary-600" />
                  </div>
                ) : chatMessages.length === 0 ? (
                  <div className="text-center py-16 text-slate-400 dark:text-slate-500 text-xs font-medium">
                    No messages yet. Send a message to start chatting!
                  </div>
                ) : (
                  (() => {
                    const visibleMsgs = chatMessages.filter((msg) => {
                      if (!chatSearchTerm.trim()) return true;
                      if (msg.isDeletedForEveryone) return false;
                      const text = (msg.message || msg.text || '').toLowerCase();
                      return text.includes(chatSearchTerm.toLowerCase());
                    });

                    return visibleMsgs.map((msg, idx) => {
                      const msgId = (msg._id || msg.id || '').toString();
                      const currentUserIdStr = (user?._id || user?.id)?.toString();
                      const msgSenderId = (msg.senderId?._id || msg.senderId || msg.sender)?.toString();
                      const isMe = msg.sender === 'me' || (currentUserIdStr && msgSenderId && currentUserIdStr === msgSenderId);
                      const isDeleted = Boolean(msg.isDeletedForEveryone);
                      const text = msg.message || msg.text;
                      const mediaUrl = msg.mediaUrl || msg.file?.url;
                      const fileName = msg.fileName || msg.file?.name;
                      const fileSize = msg.fileSize ? (msg.fileSize / 1024).toFixed(1) + ' KB' : msg.file?.size;
                      const timeStr = msg.timestamp
                        ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : msg.timestamp;
                      const isMenuOpen = activeMessageMenuId === msgId;

                      const currentDayKey = getCalendarDayKey(msg.timestamp);
                      const prevDayKey = idx > 0 ? getCalendarDayKey(visibleMsgs[idx - 1].timestamp) : '';
                      const showDateDivider = Boolean(currentDayKey) && currentDayKey !== prevDayKey;

                      return (
                        <React.Fragment key={msgId || idx}>
                          {/* WhatsApp-Style Centered Date Divider (Today / Yesterday / Weekday / DD/MM/YYYY) */}
                          {showDateDivider && (
                            <div className="flex justify-center my-2.5">
                              <span className="px-3.5 py-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm text-[11px] font-bold text-slate-500 dark:text-slate-400 rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                                {formatChatDateDivider(msg.timestamp)}
                              </span>
                            </div>
                          )}

                          <div className={`group/msg flex items-center gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                            {/* Quick Forward Arrow Button on LEFT for outgoing messages (WhatsApp style) */}
                            {isMe && !isDeleted && (
                              <button
                                type="button"
                                onClick={() => handleOpenForwardModal(msg)}
                                title="Forward message"
                                className="w-7 h-7 rounded-full bg-white/95 dark:bg-slate-800/95 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-slate-500 hover:text-emerald-600 dark:text-slate-300 dark:hover:text-emerald-400 border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex items-center justify-center shrink-0 transition-all cursor-pointer opacity-75 sm:opacity-0 sm:group-hover/msg:opacity-100 active:scale-95"
                              >
                                <Forward size={13} />
                              </button>
                            )}

                            <div
                              className={`max-w-[80%] sm:max-w-[72%] p-3.5 pr-8 rounded-2xl shadow-xs text-sm relative transition-all ${
                                isDeleted
                                  ? 'bg-slate-200/80 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border border-slate-300/60 dark:border-slate-700/60'
                                  : isMe
                                  ? 'bg-primary-600 text-white rounded-br-none'
                                  : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-800 rounded-bl-none'
                              }`}
                            >
                              {/* Per-Message Action Menu Trigger (Edit / Forward / Copy / Delete) */}
                              <div
                                className={`absolute top-2 right-2 z-20 ${
                                  isMenuOpen ? 'opacity-100' : 'opacity-75 sm:opacity-0 sm:group-hover/msg:opacity-100'
                                } transition-opacity`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  onClick={(e) => handleToggleMessageMenu(e, msg, isMe)}
                                  title="Message actions"
                                  className={`p-1 rounded-lg transition-colors cursor-pointer ${
                                    isMe && !isDeleted
                                      ? 'hover:bg-white/20 text-white/90'
                                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                  }`}
                                >
                                  <ChevronDown size={14} />
                                </button>
                              </div>

                              {/* Forwarded Badge */}
                              {msg.isForwarded && !isDeleted && (
                                <div className={`flex items-center gap-1 text-[10px] font-bold italic mb-1 ${
                                  isMe ? 'text-white/75' : 'text-slate-400'
                                }`}>
                                  <Forward size={11} />
                                  <span>Forwarded</span>
                                </div>
                              )}

                              {/* Sender Name tag for recipient messages */}
                              {!isMe && !isDeleted && (
                                <p className="text-[11px] font-extrabold text-primary-600 dark:text-primary-400 mb-1">
                                  {msg.senderName || activeChatFriend.name}
                                </p>
                              )}

                              {isDeleted ? (
                                <p className="flex items-center gap-1.5 italic text-xs font-medium py-0.5">
                                  <Ban size={13} className="shrink-0 opacity-70" />
                                  <span>This message was deleted</span>
                                </p>
                              ) : (
                                <>
                                  {/* File / Media Attachment Preview */}
                                  {mediaUrl && (
                                    <div className="mb-2 p-2 bg-black/10 dark:bg-white/10 rounded-xl overflow-hidden">
                                      {msg.messageType === 'image' || (mediaUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i)) ? (
                                        <a href={mediaUrl} target="_blank" rel="noopener noreferrer">
                                          <img src={mediaUrl} alt="Attachment" className="max-h-60 w-full object-cover rounded-lg" />
                                        </a>
                                      ) : (
                                        <a href={mediaUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-2">
                                          <FileText size={20} />
                                          <div className="min-w-0 flex-1">
                                            <p className="font-bold text-xs truncate">{fileName || 'Attached Document'}</p>
                                            {fileSize && <p className="text-[10px] opacity-80">{fileSize}</p>}
                                          </div>
                                        </a>
                                      )}
                                    </div>
                                  )}

                                  {/* Message Text */}
                                  {text && (
                                    <p className="whitespace-pre-wrap leading-relaxed font-medium">{text}</p>
                                  )}
                                </>
                              )}

                              {/* Time, Edited Label & Read Status Bar */}
                              <div className={`flex items-center justify-end gap-1.5 mt-1 text-[10px] ${
                                isMe && !isDeleted ? 'text-white/80' : 'text-slate-400 dark:text-slate-500'
                              }`}>
                                {msg.isEdited && !isDeleted && (
                                  <span className="italic opacity-80">Edited</span>
                                )}
                                <span>{timeStr}</span>
                                {isMe && !isDeleted && <CheckCheck size={13} className="text-white" />}
                              </div>
                            </div>

                            {/* Quick Forward Arrow Button on RIGHT for incoming messages (WhatsApp style) */}
                            {!isMe && !isDeleted && (
                              <button
                                type="button"
                                onClick={() => handleOpenForwardModal(msg)}
                                title="Forward message"
                                className="w-7 h-7 rounded-full bg-white/95 dark:bg-slate-800/95 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 text-slate-500 hover:text-emerald-600 dark:text-slate-300 dark:hover:text-emerald-400 border border-slate-200/80 dark:border-slate-700/80 shadow-sm flex items-center justify-center shrink-0 transition-all cursor-pointer opacity-75 sm:opacity-0 sm:group-hover/msg:opacity-100 active:scale-95"
                              >
                                <Forward size={13} />
                              </button>
                            )}
                          </div>
                        </React.Fragment>
                      );
                    });
                  })()
                )}
              </div>

              {/* File Attachment Preview Bar before sending */}
              {attachedFile && (
                <div className="px-4 py-2 bg-slate-200/70 dark:bg-slate-900 border-t border-slate-300/50 dark:border-slate-800 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    {attachedFile.type === 'image' ? (
                      <img src={attachedFile.url} alt="Preview" className="w-10 h-10 rounded-lg object-cover" />
                    ) : (
                      <FileText size={20} className="text-primary-500" />
                    )}
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{attachedFile.name}</p>
                      <p className="text-[10px] text-slate-400">{attachedFile.size}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setAttachedFile(null)}
                    className="p-1 hover:bg-slate-300 dark:hover:bg-slate-800 rounded-full text-slate-500"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              {/* Edit Message Banner */}
              {editingMessage && (
                <div className="px-4 py-2 bg-primary-50 dark:bg-primary-950/40 border-t border-primary-200/70 dark:border-primary-900/50 flex items-center justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Edit3 size={15} className="text-primary-600 dark:text-primary-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-wider text-primary-600 dark:text-primary-400">
                        Editing Message
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-300 truncate">
                        {editingMessage.originalText}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingMessage(null);
                      setInputMessage('');
                    }}
                    className="p-1.5 hover:bg-primary-100 dark:hover:bg-primary-900/50 rounded-full text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors cursor-pointer"
                    title="Cancel Edit (Esc)"
                  >
                    <X size={15} />
                  </button>
                </div>
              )}

              {/* WhatsApp Web Enterprise Unified Pill Chat Input Bar */}
              <form onSubmit={handleSendMessage} className="p-2 sm:p-3.5 bg-white dark:bg-slate-900 border-t border-slate-200/90 dark:border-slate-800/90 shrink-0 z-10">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {/* Unified Input Box Pill Card */}
                <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-100 dark:bg-slate-800/90 rounded-2xl sm:rounded-full px-3 sm:px-4 py-1 sm:py-1.5 border border-slate-200/80 dark:border-slate-700/80 focus-within:ring-2 focus-within:ring-primary-500/20 focus-within:border-primary-500/80 focus-within:bg-white dark:focus-within:bg-slate-800 transition-all shadow-xs">
                  {/* Text Input Field */}
                  <input
                    ref={chatInputRef}
                    type="text"
                    placeholder={editingMessage ? 'Edit your message...' : `Message ${activeChatFriend.name || 'Friend'}...`}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape' && editingMessage) {
                        setEditingMessage(null);
                        setInputMessage('');
                      }
                    }}
                    style={{ outline: 'none', boxShadow: 'none' }}
                    className="flex-1 min-w-0 bg-transparent py-1.5 sm:py-2 px-1 text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 border-none outline-none focus:outline-none focus:ring-0 focus:border-none shadow-none"
                  />

                  {/* Right Side Buttons Container inside Input Box */}
                  <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                    {/* File Attachment Button (hidden while editing) */}
                    {!editingMessage && (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        title="Attach File or Photo"
                        className="p-1.5 sm:p-2 text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 rounded-full transition-all active:scale-95 flex items-center justify-center"
                      >
                        <Paperclip size={17} />
                      </button>
                    )}

                    {/* Send / Save Edit Button */}
                    <button
                      type="submit"
                      disabled={sendingMsg || (!inputMessage.trim() && !attachedFile)}
                      title={editingMessage ? 'Save Changes' : 'Send Message'}
                      className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary-600 hover:bg-primary-700 disabled:opacity-35 disabled:hover:bg-primary-600 text-white transition-all shadow-md shadow-primary-500/20 shrink-0 active:scale-95 flex items-center justify-center cursor-pointer"
                    >
                      {sendingMsg ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : editingMessage ? (
                        <Check size={16} />
                      ) : (
                        <Send size={15} className="ml-0.5" />
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </>
          ) : (
            /* WhatsApp Web Style Default Empty State */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/50 dark:bg-slate-950/40">
              <div className="w-20 h-20 bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 rounded-3xl flex items-center justify-center mb-4 shadow-sm border border-primary-100 dark:border-primary-900/40">
                <MessageSquare size={36} />
              </div>
              <h3 className="text-xl font-extrabold text-slate-800 dark:text-white mb-2">
                SmartSplit Direct Chat Workspace
              </h3>
              <p className="text-slate-400 dark:text-slate-500 text-xs max-w-sm leading-relaxed font-medium mb-6">
                Select a contact from the left sidebar list to start real-time messaging, sharing documents, and managing chats.
              </p>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-2xs text-[11px] font-bold text-slate-500 dark:text-slate-400">
                <Sparkles size={14} className="text-amber-500" />
                <span>Instant Real-Time WebSocket Encrypted Messaging</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* WHATSAPP ENTERPRISE CONTACT INFO OVERLAY MODAL */}
      <AnimatePresence>
        {selectedFriendProfile && (
          <div className="fixed inset-0 z-50 flex items-center justify-end sm:justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-md" onClick={() => setSelectedFriendProfile(null)}>
            <motion.div
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 100, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 w-full sm:max-w-md h-full sm:h-auto sm:max-h-[92vh] sm:rounded-[2.2rem] shadow-2xl flex flex-col overflow-hidden border border-slate-200/80 dark:border-slate-800"
            >
              {/* WhatsApp Contact Info Top Header */}
              <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800/80 flex items-center gap-4 shrink-0">
                <button
                  onClick={() => setSelectedFriendProfile(null)}
                  title="Close"
                  className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white tracking-tight">Contact info</h3>
              </div>

              {/* Contact Info Body */}
              <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6 text-center">
                {/* Large Center Circular Avatar */}
                {(() => {
                  const profilePresence = getContactPresence(selectedFriendProfile);
                  return (
                    <div className="flex flex-col items-center">
                      <div className="relative inline-block mb-4">
                        <img
                          src={selectedFriendProfile.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedFriendProfile.name || 'User')}&background=random`}
                          alt={selectedFriendProfile.name}
                          className="w-36 h-36 rounded-full border-4 border-white dark:border-slate-800 shadow-xl object-cover"
                        />
                        {profilePresence.isOnline && (
                          <div className="absolute bottom-2 right-2 w-5 h-5 bg-emerald-500 ring-4 ring-white dark:ring-slate-900 rounded-full shadow-md" title="Online" />
                        )}
                      </div>

                      <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                        {selectedFriendProfile.name || 'Unknown User'}
                      </h2>
                      <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold mt-0.5">
                        {selectedFriendProfile.mobile ? selectedFriendProfile.mobile : selectedFriendProfile.email || 'SmartSplit Contact'}
                      </p>
                      <span className={`mt-2 px-3 py-0.5 rounded-full text-[11px] font-bold ${
                        profilePresence.isOnline
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      }`}>
                        {profilePresence.label}
                      </span>
                    </div>
                  );
                })()}

                {/* WhatsApp Action Buttons Bar (Voice, Video, Search) */}
                <div className="flex items-center justify-center gap-6 py-2">
                  {/* Disabled Voice Call Button */}
                  <div className="relative flex flex-col items-center">
                    <button
                      disabled
                      onMouseEnter={() => setHoveredCallBtn('profile-voice')}
                      onMouseLeave={() => setHoveredCallBtn(null)}
                      className="flex flex-col items-center gap-1.5 cursor-not-allowed group opacity-60"
                      aria-label="Voice Call (Upcoming Feature)"
                    >
                      <div className="p-3.5 bg-slate-100/80 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500 rounded-full transition-all shadow-xs border border-slate-200/50 dark:border-slate-800">
                        <Phone size={20} />
                      </div>
                      <span className="text-xs font-bold text-slate-400 dark:text-slate-500">Voice</span>
                    </button>

                    <AnimatePresence>
                      {hoveredCallBtn === 'profile-voice' && (
                        <motion.div
                          initial={{ opacity: 0, y: -6, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -6, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap z-50 pointer-events-none"
                        >
                          <div className="bg-slate-900/95 dark:bg-slate-950/95 text-white backdrop-blur-md border border-slate-700/80 shadow-2xl rounded-xl px-3 py-1.5 text-[11px] font-bold flex items-center gap-2">
                            <Sparkles size={13} className="text-amber-400 animate-pulse shrink-0" />
                            <span>Audio Call</span>
                            <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 text-[9px] font-extrabold rounded-md uppercase tracking-wider border border-amber-500/30">
                              Upcoming Feature
                            </span>
                          </div>
                          <div className="w-2 h-2 bg-slate-900/95 dark:bg-slate-950/95 rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2 border-b border-r border-slate-700/80" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Disabled Video Call Button */}
                  <div className="relative flex flex-col items-center">
                    <button
                      disabled
                      onMouseEnter={() => setHoveredCallBtn('profile-video')}
                      onMouseLeave={() => setHoveredCallBtn(null)}
                      className="flex flex-col items-center gap-1.5 cursor-not-allowed group opacity-60"
                      aria-label="Video Call (Upcoming Feature)"
                    >
                      <div className="p-3.5 bg-slate-100/80 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500 rounded-full transition-all shadow-xs border border-slate-200/50 dark:border-slate-800">
                        <Video size={20} />
                      </div>
                      <span className="text-xs font-bold text-slate-400 dark:text-slate-500">Video</span>
                    </button>

                    <AnimatePresence>
                      {hoveredCallBtn === 'profile-video' && (
                        <motion.div
                          initial={{ opacity: 0, y: -6, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -6, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap z-50 pointer-events-none"
                        >
                          <div className="bg-slate-900/95 dark:bg-slate-950/95 text-white backdrop-blur-md border border-slate-700/80 shadow-2xl rounded-xl px-3 py-1.5 text-[11px] font-bold flex items-center gap-2">
                            <Sparkles size={13} className="text-amber-400 animate-pulse shrink-0" />
                            <span>Video Call</span>
                            <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 text-[9px] font-extrabold rounded-md uppercase tracking-wider border border-amber-500/30">
                              Upcoming Feature
                            </span>
                          </div>
                          <div className="w-2 h-2 bg-slate-900/95 dark:bg-slate-950/95 rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2 border-b border-r border-slate-700/80" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <button
                    onClick={() => {
                      setSelectedFriendProfile(null);
                      setActiveChatFriend(selectedFriendProfile);
                    }}
                    className="flex flex-col items-center gap-2 group"
                  >
                    <div className="p-3.5 bg-slate-100 dark:bg-slate-800 group-hover:bg-primary-50 dark:group-hover:bg-primary-950/80 text-slate-700 dark:text-slate-200 group-hover:text-primary-600 rounded-full transition-all shadow-xs">
                      <Search size={20} />
                    </div>
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400 group-hover:text-primary-600">Search</span>
                  </button>
                </div>

                <hr className="border-slate-100 dark:border-slate-800" />

                {/* About Section */}
                <div className="text-left bg-slate-50/70 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80">
                  <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-1">About</p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    SmartSplit Verified Member • Active Enterprise User
                  </p>
                </div>

                {/* Media, links and docs Section */}
                <div className="text-left bg-slate-50/70 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100 font-extrabold text-sm">
                      <ImageIcon size={18} className="text-primary-500" />
                      <span>Media, links and docs</span>
                    </div>
                    <span className="text-xs font-extrabold text-slate-400 bg-slate-200/70 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                      {chatMessages.filter(m => m.mediaUrl).length || 0}
                    </span>
                  </div>

                  {chatMessages.filter(m => m.mediaUrl).length > 0 ? (
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                      {chatMessages.filter(m => m.mediaUrl).map((m, idx) => (
                        <a key={idx} href={m.mediaUrl} target="_blank" rel="noopener noreferrer" className="shrink-0">
                          {m.messageType === 'image' || m.mediaUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                            <img src={m.mediaUrl} alt="Media" className="w-16 h-16 rounded-xl object-cover border border-slate-200 dark:border-slate-700" />
                          ) : (
                            <div className="w-16 h-16 rounded-xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
                              <FileText size={20} />
                            </div>
                          )}
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 font-medium">No media or docs shared yet.</p>
                  )}
                </div>

                {/* Enterprise Contact Details Card */}
                <div className="text-left bg-slate-50/70 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 space-y-3">
                  <p className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2">Member Details</p>

                  <div className="flex items-center gap-3">
                    <User size={16} className="text-primary-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Full Name</p>
                      <p className="text-xs font-extrabold text-slate-800 dark:text-white truncate">{selectedFriendProfile.name || 'Unknown User'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Mail size={16} className="text-primary-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email Address</p>
                      <p className="text-xs font-extrabold text-slate-800 dark:text-white truncate">{selectedFriendProfile.email || 'No email provided'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Phone size={16} className="text-primary-500 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mobile Number</p>
                      <p className="text-xs font-extrabold text-slate-800 dark:text-white truncate">{selectedFriendProfile.mobile || 'Not provided'}</p>
                    </div>
                  </div>
                </div>

                {/* System Trust Verification */}
                <div className="p-3.5 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200/50 dark:border-emerald-900/40 flex items-center justify-between text-left">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div>
                      <p className="font-extrabold text-xs text-slate-800 dark:text-slate-100">Verified Member</p>
                      <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">Enterprise Security Verified</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-[9px] font-black rounded-md uppercase tracking-wider">
                    100% Secure
                  </span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Friend by Email Modal */}
      <AnimatePresence>
        {showAddFriendModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/40">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-primary-50 dark:bg-primary-950 text-primary-600 dark:text-primary-400 rounded-xl">
                    <UserPlus size={20} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Add New Friend</h3>
                    <p className="text-[11px] font-bold text-slate-400">Search registered SmartSplit users by email</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowAddFriendModal(false);
                    setSearchEmail('');
                    setFoundUser(null);
                    setSearchError('');
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-4">
                <form onSubmit={handleSearchUserByEmail} className="space-y-3">
                  <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">
                    Enter User Email Address
                  </label>
                  <div className="relative flex items-center">
                    <Mail size={18} className="absolute left-3.5 text-slate-400" />
                    <input
                      type="email"
                      required
                      placeholder="e.g. friend@gmail.com"
                      value={searchEmail}
                      onChange={(e) => {
                        setSearchEmail(e.target.value);
                        setSearchError('');
                        setFoundUser(null);
                      }}
                      className="w-full pl-10 pr-24 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200/90 dark:border-slate-700 rounded-2xl text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
                    />
                    <button
                      type="submit"
                      disabled={searchingUser || !searchEmail.trim()}
                      className="absolute right-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-40 text-white rounded-xl text-xs font-extrabold transition-all active:scale-95 flex items-center gap-1.5"
                    >
                      {searchingUser ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                      <span>Find</span>
                    </button>
                  </div>
                </form>

                {/* Search Results Area */}
                {searchingUser && (
                  <div className="py-6 flex flex-col items-center justify-center text-slate-400 text-xs font-bold gap-2">
                    <Loader2 size={24} className="animate-spin text-primary-600" />
                    <p>Searching SmartSplit database...</p>
                  </div>
                )}

                {searchError && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/50 rounded-2xl text-xs font-bold text-rose-600 dark:text-rose-400 text-center">
                    {searchError}
                  </div>
                )}

                {/* Found Registered User Single-Row Profile Card */}
                {foundUser && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-3.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700/80 rounded-2xl flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative shrink-0">
                        <img
                          src={foundUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(foundUser.name || 'User')}&background=random`}
                          alt={foundUser.name}
                          className="w-12 h-12 rounded-2xl object-cover border border-slate-200 dark:border-slate-700"
                        />
                        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 ring-2 ring-white dark:ring-slate-900 rounded-full" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                          {foundUser.name || 'SmartSplit User'}
                        </h4>
                        <p className="text-xs text-slate-400 font-medium truncate">
                          {foundUser.email}
                        </p>
                        {foundUser.mobile && (
                          <p className="text-[10px] text-slate-400 font-medium">
                            Phone: {foundUser.mobile}
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleStartChatWithFoundUser(foundUser)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold shadow-sm transition-all active:scale-95 shrink-0 flex items-center gap-1.5"
                    >
                      <MessageSquare size={15} />
                      <span>Start Chat</span>
                    </button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Message Modal (Delete for me / Delete for everyone) */}
      <AnimatePresence>
        {deleteConfirmMessage && (() => {
          const delSenderId = (deleteConfirmMessage.senderId?._id || deleteConfirmMessage.senderId || deleteConfirmMessage.sender)?.toString();
          const isMyMsg = deleteConfirmMessage.sender === 'me' || (currentUserId && delSenderId && currentUserId === delSenderId);
          const canDeleteForEveryone = isMyMsg && !deleteConfirmMessage.isDeletedForEveryone;

          return (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm"
              onClick={() => !isDeletingMsg && setDeleteConfirmMessage(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-5 space-y-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                    <Trash2 size={18} />
                  </div>
                  <div>
                    <h3 className="font-black text-base text-slate-900 dark:text-white">Delete Message?</h3>
                    <p className="text-xs text-slate-400">Choose how you want to delete this message.</p>
                  </div>
                </div>

                {!deleteConfirmMessage.isDeletedForEveryone && (deleteConfirmMessage.message || deleteConfirmMessage.text) && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 line-clamp-2 italic">
                    "{deleteConfirmMessage.message || deleteConfirmMessage.text}"
                  </div>
                )}

                <div className="flex flex-col gap-2 pt-1">
                  {canDeleteForEveryone && (
                    <button
                      type="button"
                      disabled={isDeletingMsg}
                      onClick={() => handleDeleteMessage('everyone')}
                      className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      {isDeletingMsg ? 'Deleting...' : 'Delete for everyone'}
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={isDeletingMsg}
                    onClick={() => handleDeleteMessage('me')}
                    className="w-full py-2.5 px-4 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Delete for me
                  </button>
                  <button
                    type="button"
                    disabled={isDeletingMsg}
                    onClick={() => setDeleteConfirmMessage(null)}
                    className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* Forward Message Modal */}
      <AnimatePresence>
        {forwardModalMessage && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm"
            onClick={() => !isForwardingMsg && setForwardModalMessage(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="px-5 py-4 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/40 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-xl">
                    <Forward size={18} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Forward Message</h3>
                    <p className="text-[11px] font-bold text-slate-400">Select one or more contacts</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setForwardModalMessage(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-4 space-y-3 flex-1 overflow-y-auto no-scrollbar">
                {/* Preview of message to forward */}
                <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200/70 dark:border-slate-800 text-xs">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
                    Message Preview
                  </span>
                  <p className="text-slate-700 dark:text-slate-200 font-medium line-clamp-2">
                    {forwardModalMessage.message || forwardModalMessage.text || (forwardModalMessage.mediaUrl ? `📎 ${forwardModalMessage.fileName || 'Attachment'}` : '')}
                  </p>
                </div>

                {/* Search Contacts */}
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search contacts to forward..."
                    value={forwardSearchTerm}
                    onChange={(e) => setForwardSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-800 dark:text-white outline-none focus:border-primary-500"
                  />
                </div>

                {/* Contacts List */}
                <div className="divide-y divide-slate-100 dark:divide-slate-800/60 max-h-60 overflow-y-auto no-scrollbar">
                  {sortedFriends
                    .filter((f) => {
                      if (!forwardSearchTerm.trim()) return true;
                      const q = forwardSearchTerm.toLowerCase();
                      return (f.name || '').toLowerCase().includes(q) || (f.email || '').toLowerCase().includes(q);
                    })
                    .map((friend) => {
                      const fId = (friend._id || friend.id)?.toString();
                      const isChecked = selectedForwardIds.includes(fId);

                      return (
                        <button
                          key={fId}
                          type="button"
                          onClick={() => handleToggleForwardRecipient(fId)}
                          className={`w-full py-2.5 px-2 flex items-center justify-between gap-3 text-left transition-colors rounded-xl cursor-pointer ${
                            isChecked ? 'bg-emerald-50/70 dark:bg-emerald-950/30' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <img
                              src={friend.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(friend.name || 'User')}&background=random`}
                              alt={friend.name}
                              className="w-9 h-9 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{friend.name}</p>
                              <p className="text-[10px] text-slate-400 truncate">{friend.email || friend.mobile || 'Contact'}</p>
                            </div>
                          </div>
                          <div
                            className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                              isChecked
                                ? 'bg-emerald-600 border-emerald-600 text-white'
                                : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                            }`}
                          >
                            {isChecked && <Check size={12} />}
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>

              <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  disabled={isForwardingMsg}
                  onClick={() => setForwardModalMessage(null)}
                  className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isForwardingMsg || selectedForwardIds.length === 0}
                  onClick={handleConfirmForward}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  {isForwardingMsg ? <Loader2 size={14} className="animate-spin" /> : <Forward size={14} />}
                  <span>
                    {isForwardingMsg
                      ? 'Forwarding...'
                      : `Forward${selectedForwardIds.length > 0 ? ` (${selectedForwardIds.length})` : ''}`}
                  </span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Transient Feedback Toast */}
      <AnimatePresence>
        {chatToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 bg-slate-900 dark:bg-slate-800 text-white text-xs font-bold rounded-full shadow-xl border border-slate-700 flex items-center gap-2"
          >
            <Check size={14} className="text-emerald-400" />
            <span>{chatToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Viewport-Aware Floating Message Action Menu (never clipped by scroll container) */}
      <AnimatePresence>
        {activeMessageMenu && (() => {
          const { msg, isMe, openUpward, style } = activeMessageMenu;
          const isDeleted = Boolean(msg.isDeletedForEveryone);
          const text = msg.message || msg.text;
          const canEdit = isMe && !isDeleted && Boolean(text || msg.messageType === 'text');

          return (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setActiveMessageMenu(null)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: openUpward ? 6 : -6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: openUpward ? 6 : -6 }}
                transition={{ duration: 0.12 }}
                style={style}
                onClick={(e) => e.stopPropagation()}
                className="fixed z-50 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200/90 dark:border-slate-700/80 py-1 text-slate-800 dark:text-slate-100"
              >
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => handleStartEditMessage(msg)}
                    className="w-full px-3.5 py-2 text-left text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <Edit3 size={13} className="text-primary-500" />
                    <span>Edit</span>
                  </button>
                )}

                {!isDeleted && (
                  <button
                    type="button"
                    onClick={() => handleOpenForwardModal(msg)}
                    className="w-full px-3.5 py-2 text-left text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <Forward size={13} className="text-emerald-500" />
                    <span>Forward</span>
                  </button>
                )}

                {text && !isDeleted && (
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(text);
                      setActiveMessageMenu(null);
                      showToast('Copied to clipboard');
                    }}
                    className="w-full px-3.5 py-2 text-left text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <Copy size={13} className="text-slate-400" />
                    <span>Copy</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setDeleteConfirmMessage(msg);
                    setActiveMessageMenu(null);
                  }}
                  className="w-full px-3.5 py-2 text-left text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <Trash2 size={13} />
                  <span>Delete</span>
                </button>
              </motion.div>
            </>
          );
        })()}
      </AnimatePresence>
    </div>
  );
};

export default Friends;
