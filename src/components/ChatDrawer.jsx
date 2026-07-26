import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { X, Send, MessageCircle, Paperclip, Image as ImageIcon, FileText, Mic, Square, Trash2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../utils/api';
import useAuthStore from '../store/useAuthStore';
import useVoiceRecorder from '../hooks/useVoiceRecorder';
import MessageBubble from './MessageBubble';

const ChatDrawer = ({ groupId, groupName, isOpen, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  
  const { user } = useAuthStore();
  const { 
    isRecording, 
    recordingTime, 
    audioBlob, 
    startRecording, 
    stopRecording, 
    cancelRecording, 
    formatTime 
  } = useVoiceRecorder();

  const socketRef = useRef();
  const scrollRef = useRef();
  const fileInputRef = useRef();

  useEffect(() => {
    if (isOpen && groupId) {
      fetchMessages();

      const socketUrl = import.meta.env.MODE === 'production' ? 'https://smartsplitbackend.vercel.app' : (import.meta.env.VITE_API_URL || 'http://localhost:5000');
      
      if (socketUrl.includes('vercel.app')) {
        console.warn('WebSockets are disabled on Vercel deployments. Falling back to HTTP polling.');
        return;
      }

      socketRef.current = io(socketUrl, {
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 10000,
      });

      socketRef.current.on('connect_error', (err) => {
        console.warn('Socket connection error. Realtime chat may be unavailable:', err.message);
      });

      socketRef.current.emit('joinGroup', groupId);

      socketRef.current.on('newMessage', (message) => {
        setMessages((prev) => [...prev, message]);
      });

      return () => {
        if (socketRef.current) {
          socketRef.current.emit('leaveGroup', groupId);
          socketRef.current.disconnect();
        }
      };
    }
  }, [isOpen, groupId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isRecording]);

  useEffect(() => {
    if (audioBlob) {
      handleSendVoice();
    }
  }, [audioBlob]);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/chat/${groupId}`);
      setMessages(response.data);
    } catch (error) {
      console.error('Error fetching chat messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      await api.post(`/chat/${groupId}`, { 
        message: newMessage,
        messageType: 'text'
      });
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    setShowAttachments(false);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const uploadRes = await api.post(`/chat/upload/${groupId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const { mediaUrl, mediaPublicId, fileName, fileSize } = uploadRes.data;
      
      let messageType = 'file';
      if (file.type.startsWith('image/')) messageType = 'image';

      await api.post(`/chat/${groupId}`, {
        messageType,
        mediaUrl,
        mediaPublicId,
        fileName,
        fileSize
      });

    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSendVoice = async () => {
    if (!audioBlob) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      const file = new File([audioBlob], 'voice_message.webm', { type: 'audio/webm' });
      formData.append('file', file);
      formData.append('duration', recordingTime);

      const uploadRes = await api.post(`/chat/upload/${groupId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const { mediaUrl, mediaPublicId, fileName, fileSize, duration } = uploadRes.data;

      await api.post(`/chat/${groupId}`, {
        messageType: 'voice',
        mediaUrl,
        mediaPublicId,
        fileName,
        fileSize,
        duration: duration || recordingTime
      });

    } catch (error) {
      console.error('Error sending voice message:', error);
      alert('Failed to send voice message');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-[400px] bg-white dark:bg-slate-900 shadow-2xl z-[70] flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b dark:border-slate-800 flex items-center justify-between bg-primary-600 text-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <MessageCircle size={24} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold truncate">{groupName || 'Group Chat'}</h3>
                  <p className="text-xs text-primary-100">Group Chat</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Messages Area */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar bg-slate-50 dark:bg-slate-950/50"
            >
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="animate-spin text-primary-600" size={32} />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-2">
                  <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full">
                    <MessageCircle size={48} className="opacity-20" />
                  </div>
                  <p className="text-sm font-medium">No messages yet</p>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <MessageBubble 
                    key={msg._id || idx} 
                    msg={msg} 
                    isOwn={msg.senderId === user?._id}
                    formatTime={formatTime}
                  />
                ))
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 border-t dark:border-slate-800 bg-white dark:bg-slate-900 relative">
              {isUploading && (
                <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 z-10 flex items-center justify-center gap-2">
                  <Loader2 className="animate-spin text-primary-600" size={20} />
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Uploading Media...</span>
                </div>
              )}

              <AnimatePresence>
                {showAttachments && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute bottom-full left-4 mb-2 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border dark:border-slate-700 p-2 flex gap-2 z-20"
                  >
                    <button 
                      onClick={() => fileInputRef.current.click()}
                      className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl flex flex-col items-center gap-1 transition-colors"
                    >
                      <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-full">
                        <ImageIcon size={20} />
                      </div>
                      <span className="text-[10px] font-bold uppercase">Image</span>
                    </button>
                    <button 
                      onClick={() => fileInputRef.current.click()}
                      className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl flex flex-col items-center gap-1 transition-colors"
                    >
                      <div className="p-3 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-full">
                        <FileText size={20} />
                      </div>
                      <span className="text-[10px] font-bold uppercase">File</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload}
                className="hidden" 
              />

              <div className="flex items-end gap-2">
                <button 
                  onClick={() => setShowAttachments(!showAttachments)}
                  className={`p-3 rounded-xl transition-colors ${showAttachments ? 'bg-primary-100 text-primary-600' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                >
                  <Paperclip size={22} />
                </button>

                {isRecording ? (
                  <div className="flex-1 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/50 rounded-xl p-2 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-rose-600 rounded-full animate-pulse" />
                      <span className="text-sm font-bold text-rose-600">{formatTime(recordingTime)}</span>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={cancelRecording} className="p-2 text-slate-400 hover:text-rose-600 transition-colors">
                        <Trash2 size={20} />
                      </button>
                      <button onClick={stopRecording} className="p-2 bg-rose-600 text-white rounded-lg">
                        <Square size={16} fill="currentColor" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSendMessage} className="flex-1 flex gap-2 items-end">
                    <div className="flex-1 relative">
                      <textarea
                        rows="1"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary-500/20 transition-all resize-none max-h-32 no-scrollbar"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                      />
                    </div>
                    
                    {newMessage.trim() ? (
                      <button
                        type="submit"
                        className="p-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl shadow-lg shadow-primary-500/20 transition-all"
                      >
                        <Send size={22} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={startRecording}
                        className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-primary-600 hover:text-white rounded-xl transition-all"
                      >
                        <Mic size={22} />
                      </button>
                    )}
                  </form>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ChatDrawer;
