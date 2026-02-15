'use client'

import { useEffect, useMemo, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/use-toast'
import { getUserErrorMessage } from '@/lib/errors'
import { logger } from '@/lib/logger'

type Profile = {
  full_name: string | null
  avatar_url: string | null
}

export function ProfileForm({ user }: { user: User }) {
  const supabase = useMemo(() => createClient(), [])
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [isFetchingProfile, setIsFetchingProfile] = useState(true)
  const [traceId] = useState(() => `profile-form_${Date.now()}`)
  const [profile, setProfile] = useState<Partial<Profile>>({
    full_name: '',
    avatar_url: '',
  })

  useEffect(() => {
    const fetchProfile = async () => {
      setIsFetchingProfile(true)
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', user.id)
          .single()

        if (error) throw error

        setProfile({
          full_name: data?.full_name ?? '',
          avatar_url: data?.avatar_url ?? '',
        })
      } catch (error: unknown) {
        logger.error({
          traceId,
          scope: "profile-form",
          message: "Failed to fetch profile record.",
          data: {
            userId: user.id,
            error: error instanceof Error ? error.message : error,
          },
        })
        toast({
          title: 'Error loading profile',
          description: getUserErrorMessage(error, 'Unable to load your profile.'),
          variant: 'destructive',
        })
      } finally {
        setIsFetchingProfile(false)
      }
    }

    void fetchProfile()
  }, [supabase, traceId, toast, user.id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (error) throw error
      toast({
        title: 'Profile updated',
        description: 'Your profile changes have been saved.',
      })
    } catch (error: unknown) {
      logger.error({
        traceId,
        scope: "profile-form",
        message: "Profile update failed.",
        data: {
          userId: user.id,
          error: error instanceof Error ? error.message : error,
        },
      })
      toast({
        title: 'Update failed',
        description: getUserErrorMessage(error, 'Unable to save profile changes.'),
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0]
      if (!file) return

      const fileExt = file.name.split('.').pop()
      const filePath = `${user.id}/avatar.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      setProfile(prev => ({ ...prev, avatar_url: publicUrl }))
      toast({
        title: 'Avatar uploaded',
        description: 'Your profile avatar has been updated.',
      })
    } catch (error: unknown) {
      logger.error({
        traceId,
        scope: "profile-form",
        message: "Avatar upload failed.",
        data: {
          userId: user.id,
          error: error instanceof Error ? error.message : error,
        },
      })
      toast({
        title: 'Avatar upload failed',
        description: getUserErrorMessage(error, 'Unable to upload avatar.'),
        variant: 'destructive',
      })
    }
  }

  if (isFetchingProfile) {
    return <div className="animate-pulse h-24 bg-gray-200 rounded-lg"></div>
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="avatar" className="block text-sm font-medium text-gray-700">
          Profile Picture
        </label>
        <div className="mt-1 flex items-center space-x-4">
          <img
            src={profile.avatar_url || '/default-avatar.png'}
            alt="Profile"
            className="h-12 w-12 rounded-full object-cover"
          />
          <input
            type="file"
            id="avatar"
            accept="image/*"
            onChange={handleAvatarUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => document.getElementById('avatar')?.click()}
            className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            Change
          </button>
        </div>
      </div>

      <div>
        <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
          Full Name
        </label>
        <div className="mt-1">
          <input
            type="text"
            id="fullName"
            value={profile.full_name || ''}
            onChange={(e) => setProfile(prev => ({ ...prev, full_name: e.target.value }))}
            className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
          />
        </div>
      </div>

      <div>
        <button
          type="submit"
          disabled={loading}
          className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}