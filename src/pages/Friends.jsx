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
  UserPlus
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

  // Real-time metadata maps for left sidebar
  const [lastMessages, setLastMessages] = useState({});
  const [unreadCounts, setUnreadCounts] = useState({});

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

  const fetchRecentChats = async () => {
    try {
      const response = await api.get('/chat/recent-chats');
      if (response.data?.recentChats) {
        setLastMessages((prev) => ({
          ...response.data.recentChats,
          ...prev
        }));
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

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [currentUserId]);

  // 2. Handle room joining & history fetch when activeChatFriend changes
  useEffect(() => {
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
      setFriends(response.data);
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

  const formatMessageTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '';
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (isYesterday) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
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
                      <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 ring-2 ring-white dark:ring-slate-950 rounded-full" title="Online" />
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
                      <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-emerald-500 ring-2 ring-white dark:ring-slate-900 rounded-full" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-extrabold text-xs sm:text-base text-slate-800 dark:text-white group-hover:text-primary-600 transition-colors truncate max-w-[100px] xs:max-w-[140px] sm:max-w-none">
                          {activeChatFriend.name || 'Unknown User'}
                        </h3>
                        <span className="hidden sm:inline-flex px-1.5 py-0.2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold rounded-md shrink-0">
                          Online
                        </span>
                      </div>
                      <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate max-w-[100px] xs:max-w-[140px] sm:max-w-none">
                        {activeChatFriend.mobile ? `Phone: ${activeChatFriend.mobile}` : activeChatFriend.email || 'SmartSplit Contact'}
                      </p>
                    </div>
                  </div>
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
                                if (window.confirm(`Clear chat history with ${activeChatFriend.name || 'this contact'}?`)) {
                                  setChatMessages([]);
                                }
                              }}
                              className="w-full px-4 py-2.5 text-left text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2.5 transition-colors"
                            >
                              <Trash2 size={15} />
                              <span>Clear chat</span>
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
                  chatMessages
                    .filter((msg) => {
                      if (!chatSearchTerm.trim()) return true;
                      const text = (msg.message || msg.text || '').toLowerCase();
                      return text.includes(chatSearchTerm.toLowerCase());
                    })
                    .map((msg) => {
                      const currentUserId = (user?._id || user?.id)?.toString();
                      const msgSenderId = (msg.senderId?._id || msg.senderId || msg.sender)?.toString();
                      const isMe = msg.sender === 'me' || (currentUserId && msgSenderId && currentUserId === msgSenderId);
                      const text = msg.message || msg.text;
                      const mediaUrl = msg.mediaUrl || msg.file?.url;
                      const fileName = msg.fileName || msg.file?.name;
                      const fileSize = msg.fileSize ? (msg.fileSize / 1024).toFixed(1) + ' KB' : msg.file?.size;
                      const timeStr = msg.timestamp
                        ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : msg.timestamp;

                      return (
                        <div
                          key={msg._id || msg.id || Math.random()}
                          className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                        >
                          <div className={`max-w-[85%] sm:max-w-[75%] p-3.5 rounded-2xl shadow-xs text-sm relative ${isMe
                              ? 'bg-primary-600 text-white rounded-br-none'
                              : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-800 rounded-bl-none'
                            }`}>
                            {/* Sender Name tag for recipient messages */}
                            {!isMe && (
                              <p className="text-[11px] font-extrabold text-primary-600 dark:text-primary-400 mb-1">
                                {msg.senderName || activeChatFriend.name}
                              </p>
                            )}

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

                            {/* Time & Read Status Bar */}
                            <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${isMe ? 'text-white/80' : 'text-slate-400 dark:text-slate-500'
                              }`}>
                              <span>{timeStr}</span>
                              {isMe && <CheckCheck size={13} className="text-white" />}
                            </div>
                          </div>
                        </div>
                      );
                    })
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
                    type="text"
                    placeholder={`Message ${activeChatFriend.name || 'Friend'}...`}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    style={{ outline: 'none', boxShadow: 'none' }}
                    className="flex-1 min-w-0 bg-transparent py-1.5 sm:py-2 px-1 text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 border-none outline-none focus:outline-none focus:ring-0 focus:border-none shadow-none"
                  />

                  {/* Right Side Buttons Container inside Input Box */}
                  <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                    {/* File Attachment Button */}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      title="Attach File or Photo"
                      className="p-1.5 sm:p-2 text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 rounded-full transition-all active:scale-95 flex items-center justify-center"
                    >
                      <Paperclip size={17} />
                    </button>

                    {/* Send Message Button */}
                    <button
                      type="submit"
                      disabled={sendingMsg || (!inputMessage.trim() && !attachedFile)}
                      title="Send Message"
                      className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary-600 hover:bg-primary-700 disabled:opacity-35 disabled:hover:bg-primary-600 text-white transition-all shadow-md shadow-primary-500/20 shrink-0 active:scale-95 flex items-center justify-center"
                    >
                      {sendingMsg ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} className="ml-0.5" />}
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
                <div className="flex flex-col items-center">
                  <div className="relative inline-block mb-4">
                    <img
                      src={selectedFriendProfile.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedFriendProfile.name || 'User')}&background=random`}
                      alt={selectedFriendProfile.name}
                      className="w-36 h-36 rounded-full border-4 border-white dark:border-slate-800 shadow-xl object-cover"
                    />
                    <div className="absolute bottom-2 right-2 w-5 h-5 bg-emerald-500 ring-4 ring-white dark:ring-slate-900 rounded-full shadow-md" title="Active" />
                  </div>

                  <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    {selectedFriendProfile.name || 'Unknown User'}
                  </h2>
                  <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold mt-0.5">
                    {selectedFriendProfile.mobile ? selectedFriendProfile.mobile : selectedFriendProfile.email || 'SmartSplit Contact'}
                  </p>
                </div>

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
    </div>
  );
};

export default Friends;
