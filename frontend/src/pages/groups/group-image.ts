// Card/hero image for a group: the group's own image when set, otherwise a
// bundled fallback picked by region keyword (contract: docs/API_FLIGHTMEET.md).
import { apiUrl } from '@/lib/api'
import type { GroupSummary } from '@/lib/types'
import imgBlackforest from '@/assets/groups/group-blackforest.jpg'
import imgAlps from '@/assets/groups/group-alps.jpg'
import imgValley from '@/assets/groups/group-valley.jpg'
import imgXc from '@/assets/groups/group-xc.jpg'

export function groupImageSrc(group: Pick<GroupSummary, 'image' | 'region'>): string {
  if (group.image) {
    // Backend paths (e.g. /media/...) need the /public prefix in prod.
    return group.image.startsWith('/') ? apiUrl(group.image) : group.image
  }
  const region = group.region.toLowerCase()
  if (region.includes('black forest') || region.includes('schwarzwald')) return imgBlackforest
  if (region.includes('alp')) return imgAlps
  if (region.includes('mosel') || region.includes('valley')) return imgValley
  return imgXc
}
