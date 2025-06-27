import React, { useEffect, useState } from 'react';
import { useApi } from '../hooks/useApi';

const CallbackPage: React.FC = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const api = useApi();

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const error = urlParams.get('error');

      if (error) {
        setStatus('error');
        setMessage(`認証エラー: ${error}`);
        return;
      }

      if (!code) {
        setStatus('error');
        setMessage('認証コードが見つかりません');
        return;
      }

      // Slack認証処理
      const authResponse = await api.handleSlackCallback(code);
      
      if (authResponse.success) {
        setStatus('success');
        setMessage('Slack認証が完了しました。データのインポートを開始します...');
        
        // データインポート開始
        await api.importSlackData(authResponse.workspaceId, 'dummy-token');
        
        // ホームページにリダイレクト
        setTimeout(() => {
          window.location.href = '/';
        }, 3000);
      } else {
        setStatus('error');
        setMessage('認証に失敗しました');
      }
    } catch (error: any) {
      setStatus('error');
      setMessage(error.response?.data?.error || '認証処理中にエラーが発生しました');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
        {status === 'loading' && (
          <>
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-slack-purple mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold mb-2">認証処理中...</h2>
            <p className="text-gray-600">Slackワークスペースに接続しています</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <div className="text-green-500 text-6xl mb-4">✓</div>
            <h2 className="text-xl font-semibold mb-2 text-green-700">認証成功！</h2>
            <p className="text-gray-600">{message}</p>
            <div className="mt-4">
              <div className="animate-pulse text-sm text-gray-500">
                ホームページに自動で移動します...
              </div>
            </div>
          </>
        )}
        
        {status === 'error' && (
          <>
            <div className="text-red-500 text-6xl mb-4">✗</div>
            <h2 className="text-xl font-semibold mb-2 text-red-700">認証エラー</h2>
            <p className="text-gray-600">{message}</p>
            <button
              onClick={() => window.location.href = '/'}
              className="mt-4 bg-slack-purple text-white px-4 py-2 rounded hover:bg-purple-700"
            >
              ホームに戻る
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default CallbackPage;