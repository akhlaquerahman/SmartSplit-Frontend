import React, { useEffect } from 'react';
import { io } from 'socket.io-client';
import useDebuggerStore from '../store/useDebuggerStore';
import api from '../utils/api';

const TraceSocketProvider = ({ children }) => {
  useEffect(() => {
    // 1. Connect exactly once when application mounts
    const socketUrl = import.meta.env.MODE === 'production' 
      ? 'https://smartsplitbackend.vercel.app' 
      : (import.meta.env.VITE_API_URL || 'http://localhost:5000');
      
    const socket = io(socketUrl, {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });

    socket.on('connect_error', (err) => {
      console.warn('[TRACE-UI] Socket connection error. Realtime may be unavailable:', err.message);
    });


    socket.on('connect', () => {
      console.log(`[TRACE-UI] Socket Connected`);
      console.log(`[TRACE-UI] Socket ID: ${socket.id}`);
      
      // Join the room
      socket.emit('joinTraceDebugger');
      console.log('[TRACE-UI] Joined trace-debugger');
      
      console.log('[TRACE-UI] Listening trace:started');
      console.log('[TRACE-UI] Listening trace:stage');
      console.log('[TRACE-UI] Listening trace:completed');
    });

    socket.on('trace:started', (data) => {
      console.log('[TRACE-UI] Received trace:started', data.traceId);
      
      // Clear previous trace and set the new one as active
      useDebuggerStore.getState().setActiveTrace({
        ...data,
        latency: 0,
        geminiCalled: false,
        cacheHit: false
      });

      // Synchronize from MongoDB immediately
      api.get(`/admin/ai/trace/${data.traceId}`)
        .then(res => {
          if (res.data?.success && res.data.trace) {
            useDebuggerStore.getState().setActiveTrace(res.data.trace);
          }
        })
        .catch(err => console.error('[TRACE-UI] Failed to fetch initial trace sync:', err));
    });

    socket.on('trace:stage', (data) => {
      console.log(`[TRACE-UI] Received stage ${data.stage.stage} (${data.stage.status})`);
      
      useDebuggerStore.setState((state) => {
        // If trace ID doesn't match the newest one, ignore
        if (!state.activeTrace || state.activeTrace.traceId !== data.traceId) {
          return state;
        }
        
        const newTrace = { ...state.activeTrace };
        newTrace.pipeline = [...(newTrace.pipeline || []), data.stage];
        
        if (data.stage.stage === 'LLM Router' && data.stage.status !== 'SKIPPED') {
          newTrace.geminiCalled = true;
        }
        if (data.stage.stage === 'Semantic Cache' && data.stage.status === 'SUCCESS') {
          newTrace.cacheHit = true;
        }
        if (data.stage.stage === 'Normalizer') {
          newTrace.normalizedInput = data.stage.output;
        }
        
        return { activeTrace: newTrace };
      });
    });

    socket.on('trace:completed', (data) => {
      console.log(`[TRACE-UI] Received trace Completed for ${data.traceId}`);
      useDebuggerStore.setState((state) => {
        if (state.activeTrace && state.activeTrace.traceId === data.traceId) {
          return { activeTrace: { ...state.activeTrace, latency: data.latency } };
        }
        return state;
      });
    });

    // Cleanup ONLY if the provider itself is unmounted
    return () => {
      console.log('[TRACE-UI] Disconnecting socket (App Unmount)');
      socket.disconnect();
    };
  }, []);

  return <>{children}</>;
};

export default TraceSocketProvider;
