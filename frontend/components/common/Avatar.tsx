/* eslint-disable @next/next/no-img-element */
import { Maybe, OrganisationMemberType } from '@/apollo/graphql'
import clsx from 'clsx'
import { useState } from 'react'
import { FaUserLarge } from 'react-icons/fa6'

type GenericUser = {
  name?: string | null
  email?: string | null
  image?: string | null
}

interface AvatarProps {
  member?: OrganisationMemberType
  user?: GenericUser
  size?: 'sm' | 'md' | 'lg' | 'xl' // Define the size prop with the correct type
  showTitle?: boolean
}

export const Avatar = ({ member, user, size, showTitle = true }: AvatarProps) => {
  const [useFallBack, setUseFallBack] = useState(false)

  const sizes = {
    sm: 'h-5 w-5 text-[8px]',
    md: 'h-8 w-8 text-2xs',
    lg: 'h-12 w-12 text-base',
    xl: 'h-20 w-20 text-2xl',
  }

  // Ensure at least one of member or user is provided
  if (!member && !user) {
    return (
      <div className="mr-1 rounded-full bg-center bg-no-repeat ring-1 ring-inset ring-neutral-500/40 flex items-center justify-center p-1">
        <FaUserLarge className="text-neutral-500" />
      </div>
    )
  }

  const sizeStyle = sizes[size || 'md'] // Default to 'md' size if not provided

  let avatarUrl: Maybe<string> | undefined = undefined
  let fullName: Maybe<string> | undefined = undefined
  let email: Maybe<string> | undefined = undefined

  if (member) {
    ;({ avatarUrl, fullName, email } = member)
  } else if (user) {
    avatarUrl = user.image ?? null // Ensure image is assigned as string | null
    fullName = user.name ?? null // Ensure name is assigned as string | null
    email = user.email
  }

  // Function to extract initials from full name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase())
      .join('')
  }

  // Function to generate a consistent color for a given name
  const getColorForName = (name: string) => {
    const colors = [
      'bg-red-500',
      'bg-blue-500',
      'bg-amber-500',
      'bg-emerald-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
    ]
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), name.length || 0)
    return colors[hash % colors.length]
  }

  const useImage = avatarUrl && !useFallBack

  return (
    <div
      title={showTitle ? fullName! || email! : undefined}
      className={clsx(
        'mr-1 rounded-full flex items-center justify-center select-none',
        sizeStyle,
        useImage ? 'bg-cover bg-no-repeat' : getColorForName(fullName || '')
      )}
      style={{ backgroundImage: useImage ? `url(${avatarUrl})` : undefined }}
    >
      {useImage ? (
        <img
          onError={() => setUseFallBack(true)}
          src={avatarUrl!}
          alt="Avatar"
          className="object-cover rounded-full"
        />
      ) : (
        <span className="text-zinc-100 dark:text-zinc-100 font-bold">
          {getInitials(fullName || email || '')}
        </span>
      )}
    </div>
  )
}
