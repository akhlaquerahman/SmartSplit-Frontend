import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';

export const useDashboardStats = () => {
  return useQuery({
    queryKey: ['ruleDashboardStats'],
    queryFn: async () => {
      const { data } = await api.get('/admin/ai/greetings/dashboard');
      return data;
    }
  });
};

export const useGreetings = (params) => {
  return useQuery({
    queryKey: ['greetings', params],
    queryFn: async () => {
      const { data } = await api.get('/admin/ai/greetings', { params });
      return data;
    }
  });
};

export const useCreateGreeting = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newRule) => {
      const { data } = await api.post('/admin/ai/greetings', newRule);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['greetings']);
      queryClient.invalidateQueries(['ruleDashboardStats']);
    }
  });
};

export const useUpdateGreeting = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updateData }) => {
      const { data } = await api.put(`/admin/ai/greetings/${id}`, updateData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['greetings']);
    }
  });
};

export const useDeleteGreeting = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { data } = await api.delete(`/admin/ai/greetings/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['greetings']);
      queryClient.invalidateQueries(['ruleDashboardStats']);
    }
  });
};

export const useCloneGreeting = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { data } = await api.post(`/admin/ai/greetings/${id}/clone`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['greetings']);
      queryClient.invalidateQueries(['ruleDashboardStats']);
    }
  });
};

export const useTestGreeting = () => {
  return useMutation({
    mutationFn: async (input) => {
      const { data } = await api.post('/admin/ai/greetings/test', { input });
      return data;
    }
  });
};

export const useFallbacks = (params) => {
  return useQuery({
    queryKey: ['fallbacks', params],
    queryFn: async () => {
      const { data } = await api.get('/admin/ai/fallbacks', { params });
      return data;
    }
  });
};

export const useCreateFallback = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newRule) => {
      const { data } = await api.post('/admin/ai/fallbacks', newRule);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['fallbacks']);
      queryClient.invalidateQueries(['ruleDashboardStats']);
    }
  });
};

export const useUpdateFallback = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updateData }) => {
      const { data } = await api.put(`/admin/ai/fallbacks/${id}`, updateData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['fallbacks']);
    }
  });
};

export const useDeleteFallback = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { data } = await api.delete(`/admin/ai/fallbacks/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['fallbacks']);
      queryClient.invalidateQueries(['ruleDashboardStats']);
    }
  });
};
