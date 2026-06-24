import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  useListNotificationsQuery,
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  useUnreadCountQuery,
} from '@/features/notification/api'
import { formatRelativeTime } from '@/lib/format'
import { cn } from '@/lib/utils'

export function NotificationBell() {
  // Poll the lightweight count endpoint; the full list is only fetched when the menu opens.
  const { data: count } = useUnreadCountQuery(undefined, { pollingInterval: 30_000 })
  const { data: items } = useListNotificationsQuery()
  const [markAll] = useMarkAllNotificationsReadMutation()
  const [markRead] = useMarkNotificationReadMutation()
  const unread = count?.count ?? 0

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}>
          <Bell />
          {unread > 0 && (
            <span className="tnum absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-revoked text-[10px] font-semibold text-primary-foreground">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unread > 0 && (
            <button type="button" onClick={() => void markAll()} className="text-xs font-medium text-primary hover:underline">
              Mark all read
            </button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {!items?.length ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">You&rsquo;re all caught up.</p>
        ) : (
          items.slice(0, 8).map((item) => (
            <DropdownMenuItem
              key={item.id}
              className="flex-col items-start gap-0.5"
              onSelect={() => {
                if (!item.isRead) void markRead(item.id)
              }}
            >
              <div className="flex w-full items-center gap-2">
                {!item.isRead && <span className="size-1.5 shrink-0 rounded-full bg-primary" />}
                <span className={cn('text-sm', item.isRead ? 'font-normal text-muted-foreground' : 'font-semibold text-foreground')}>
                  {item.title}
                </span>
              </div>
              <span className="line-clamp-2 text-xs text-muted-foreground">{item.body}</span>
              <span className="text-[10px] text-subtle">{formatRelativeTime(item.createdAt)}</span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
