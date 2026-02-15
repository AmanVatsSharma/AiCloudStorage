'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { getUserErrorMessage } from '@/lib/errors'
import { logger } from '@/lib/logger'
import { useToast } from '@/components/ui/use-toast'

type StorageInfo = {
  storage_used: number
  storage_limit: number
}

export function StorageUsage({ user }: { user: User }) {
  const supabase = useMemo(() => createClient(), [])
  const { toast } = useToast()
  const [storage, setStorage] = useState<StorageInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [traceId] = useState(() => `storage-usage_${Date.now()}`)

  useEffect(() => {
    async function fetchStorageInfo() {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('storage_used, storage_limit')
          .eq('id', user.id)
          .single()

        if (error) throw error
        setStorage(data)
      } catch (error: unknown) {
        logger.error({
          traceId,
          scope: "storage-usage",
          message: "Failed to fetch storage usage details.",
          data: {
            userId: user.id,
            error: error instanceof Error ? error.message : error,
          },
        })
        toast({
          title: 'Storage metrics unavailable',
          description: getUserErrorMessage(error, 'Unable to load storage usage right now.'),
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }

    void fetchStorageInfo()
  }, [supabase, toast, traceId, user.id])

  if (loading) {
    return <div className="animate-pulse h-24 bg-gray-200 rounded-lg"></div>
  }

  if (!storage) {
    return <div>Error loading storage information</div>
  }

  const usagePercentage = (storage.storage_used / storage.storage_limit) * 100
  const formattedUsed = formatBytes(storage.storage_used)
  const formattedLimit = formatBytes(storage.storage_limit)

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h3 className="text-lg font-medium text-gray-900">Storage Usage</h3>
      <div className="mt-4">
        <div className="flex justify-between text-sm text-gray-600">
          <span>{formattedUsed} used</span>
          <span>{formattedLimit} total</span>
        </div>
        <div className="mt-2 h-2 bg-gray-200 rounded-full">
          <div
            className={`h-2 rounded-full ${
              usagePercentage > 90 ? 'bg-red-500' : 'bg-blue-500'
            }`}
            style={{ width: `${Math.min(usagePercentage, 100)}%` }}
          ></div>
        </div>
        <p className="mt-2 text-sm text-gray-600">
          {usagePercentage > 90 
            ? 'Storage almost full! Consider upgrading or cleaning up.'
            : `${Math.round(usagePercentage)}% of storage used`
          }
        </p>
      </div>
    </div>
  )
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}