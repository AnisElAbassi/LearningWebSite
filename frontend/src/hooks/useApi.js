import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

export function useApi(url, options = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { immediate = true, onSuccess } = options;

  const fetchData = useCallback(async (params) => {
    setLoading(true);
    setError(null);
    try {
      const { data: result } = await api.get(url, { params });
      setData(result);
      if (onSuccess) onSuccess(result);
      return result;
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to fetch data';
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, [url, onSuccess]);

  useEffect(() => {
    if (immediate) fetchData();
  }, [immediate, fetchData]);

  return { data, loading, error, refetch: fetchData, setData };
}

export function useMutation(method = 'post') {
  const [loading, setLoading] = useState(false);

  const mutate = async (url, body, options = {}) => {
    setLoading(true);
    try {
      const { data } = await api[method](url, body);
      if (options.successMessage) toast.success(options.successMessage);
      if (options.onSuccess) options.onSuccess(data);
      return data;
    } catch (err) {
      const msg = err.response?.data?.error || 'Operation failed';
      toast.error(msg);
      if (options.onError) options.onError(err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { mutate, loading };
}

export function useLookup(slug) {
  const { data } = useApi(`/lookups/${slug}`);
  return data?.values || [];
}
