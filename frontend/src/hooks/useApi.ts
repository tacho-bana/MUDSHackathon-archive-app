import { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = '/api';

export const useApi = () => {
  const api = axios.create({
    baseURL: API_BASE_URL,
  });

  const fetchWorkspaces = async () => {
    const response = await api.get('/workspaces');
    return response.data;
  };

  const fetchChannels = async (workspaceId: string) => {
    const response = await api.get(`/channels?workspaceId=${workspaceId}`);
    return response.data;
  };

  const fetchMessages = async (channelId: string, page = 1, limit = 50) => {
    const response = await api.get(`/channels/${channelId}/messages?page=${page}&limit=${limit}`);
    return response.data;
  };

  const authenticateChannel = async (channelId: string, password?: string) => {
    const response = await api.post('/auth/channel', { channelId, password });
    return response.data;
  };

  const authenticateAdmin = async (password: string) => {
    const response = await api.post('/auth/admin', { password });
    return response.data;
  };

  const getSlackAuthUrl = async () => {
    const response = await api.get('/slack/auth');
    return response.data;
  };

  const handleSlackCallback = async (code: string) => {
    const response = await api.post('/slack/callback', { code });
    return response.data;
  };

  const importSlackData = async (workspaceId: string, accessToken: string) => {
    const response = await api.post('/slack/import', { workspaceId, accessToken });
    return response.data;
  };

  const syncSlackData = async (workspaceId: string, accessToken: string) => {
    const response = await api.post('/slack/sync', { workspaceId, accessToken });
    return response.data;
  };

  const getSyncStatus = async (workspaceId: string) => {
    const response = await api.get(`/sync/status?workspaceId=${workspaceId}`);
    return response.data;
  };

  const getSyncLogs = async (workspaceId: string) => {
    const response = await api.get(`/sync/logs?workspaceId=${workspaceId}`);
    return response.data;
  };

  return {
    fetchWorkspaces,
    fetchChannels,
    fetchMessages,
    authenticateChannel,
    authenticateAdmin,
    getSlackAuthUrl,
    handleSlackCallback,
    importSlackData,
    syncSlackData,
    getSyncStatus,
    getSyncLogs,
  };
};