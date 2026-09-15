import React, { useEffect, useRef } from 'react';
import useAIChatStore from '../../store/useAIChatStore';
import UserMessage from './UserMessage';
import AIMessage from './AIMessage';

const MessageList = () => {
  const { messages, isStreaming } = useAIChatStore();
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  const isWaitingForAI = isStreaming && (messages.length === 0 || messages[messages.length - 1]?.role === 'user');

  return (
    <div className="flex flex-col space-y-6 pb-4">
      {messages.map((msg, i) => (
        msg.role === 'user' 
          ? <UserMessage key={msg.id || i} content={msg.content} />
          : <AIMessage key={msg.id || i} content={msg.content} metadata={msg.metadata} />
      ))}
      {isWaitingForAI && (
        <AIMessage content="" />
      )}
      <div ref={bottomRef} />
    </div>
  );
};
export default MessageList;