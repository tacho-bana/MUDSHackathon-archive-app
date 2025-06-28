import React, { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import { useApi } from '../hooks/useApi'

const HomePage: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const api = useApi()

  useEffect(() => {
    checkWorkspace()
  }, [])

  const checkWorkspace = async () => {
    try {
      await api.fetchWorkspaces()
      // Always show Layout for this archive app
    } catch (error) {
      console.error('Failed to check workspace:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-slack-purple"></div>
      </div>
    )
  }

  // Always show Layout - no authentication needed for pre-configured workspace
  return <Layout />
}

export default HomePage