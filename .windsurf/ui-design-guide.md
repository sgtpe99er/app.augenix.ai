# UI Design Guide

Reference this file before making any UI changes or additions to ensure consistency with the existing design system.

---

## Color Palette

### Backgrounds (dark-first, layered)
| Layer | Class | Use |
|---|---|---|
| Page background | `bg-black` | Root page bg |
| Primary surface | `bg-zinc-900` | Cards, panels, modals |
| Secondary surface | `bg-zinc-800` | Nested cards, hover states, input backgrounds |
| Tertiary surface | `bg-zinc-700` | Inactive progress dots, subtle fills |

> **Rule:** Modals must use `bg-zinc-900` (not `bg-zinc-800`) so they sit one level above the page. Add `ring-1 ring-zinc-700` for a subtle border edge.

### Borders & Dividers
- Standard divider: `border-zinc-800`
- Modal/card ring: `ring-1 ring-zinc-700`
- Never use `border-zinc-700` for dividers inside cards — that's too bright.

### Text
| Role | Class |
|---|---|
| Primary | `text-white` |
| Secondary / labels | `text-neutral-400` |
| Muted / captions | `text-neutral-500` |
| Danger | `text-red-400` |

### Brand / Accent Colors
| Color | Use |
|---|---|
| `emerald-400` / `emerald-500` | Primary CTA buttons, active states, success |
| `emerald-500/20` | Active tab pill background |
| `blue-400` / `blue-500/20` | Info icons, stat cards |
| `yellow-400` / `yellow-500` | Warning badges, pending counts |
| `purple-400` / `purple-500/20` | Generating states |
| `cyan-400` / `cyan-500/20` | Assets ready state |
| `red-400` / `red-500/20` | Error states, destructive actions |

---

## Typography

- **Font (sans):** Montserrat — `font-sans`
- **Font (buttons/alt):** Montserrat Alternates — `font-alt`
- **Headings:** `font-bold`, sizes `text-xl` → `text-3xl`
- **Body:** default size, `text-neutral-400` for secondary
- **Labels:** `text-sm text-neutral-400`
- **Captions / meta:** `text-xs text-neutral-500`

---

## Spacing & Layout

- **Page wrapper:** `<Container>` component → `container mx-auto px-8` (max-width 1440px)
- **Section spacing:** `space-y-6` between major sections
- **Card padding:** `p-6` for full cards, `p-4` for compact cards
- **Grid:** `grid gap-4 sm:grid-cols-2 lg:grid-cols-3/4`

---

## Cards

```tsx
<div className="rounded-xl bg-zinc-900 p-6">
  ...
</div>
```

- Always `rounded-xl` (not `rounded-lg` or `rounded-2xl`)
- Always `bg-zinc-900`
- Nested sections inside a card use `bg-zinc-800 rounded-lg p-4`

---

## Tabs (Navigation)

Use **pill-style tabs with icons** — matching the admin dashboard and customer detail pages.

```tsx
<button
  className={cn(
    'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap',
    isActive
      ? 'bg-emerald-500/20 text-emerald-400'
      : 'text-neutral-400 hover:bg-zinc-800 hover:text-white'
  )}
>
  <SomeIcon className="h-4 w-4" />
  Tab Label
</button>
```

- Tab container: `flex gap-2 border-b border-zinc-800 pb-2` (or `pb-3`)
- **Never** use underline/border-bottom tab style — always pill style
- Always include an icon alongside the label

---

## Buttons

Defined in `src/components/ui/button.tsx` via CVA. Available variants:

| Variant | Appearance | Use |
|---|---|---|
| `default` | `bg-zinc-900 text-zinc-300` | Secondary actions |
| `outline` | Border only | Cancel, secondary |
| `sexy` | Black bg with animated gradient border | Primary CTA on marketing pages |
| `orange` | `bg-orange-500` | Highlight actions |
| (custom) | `bg-emerald-500 text-black hover:bg-emerald-400` | Primary admin actions |
| (custom) | `bg-red-500/20 text-red-400` | Destructive actions |

Sizes: `default` (h-10), `sm` (h-8), `lg` (h-10 px-8), `icon` (h-9 w-9)

> **Rule:** Primary admin action buttons (Create, Save, Trigger) use `bg-emerald-500 text-black hover:bg-emerald-400`. Destructive buttons use `bg-red-500/20 text-red-400 hover:bg-red-500/30`.

---

## Status Badges

Defined in `src/app/admin/tabs/types.ts` → `getStatusBadge()`.

```tsx
<span className={cn('rounded-full px-3 py-1 text-sm', getStatusBadge(status))}>
  {formatStatus(status)}
</span>
```

| Status | Style |
|---|---|
| `pending` | `bg-yellow-500/20 text-yellow-400` |
| `in_progress` | `bg-blue-500/20 text-blue-400` |
| `completed` / `active` / `approved` | `bg-emerald-500/20 text-emerald-400` |
| `generating` / `assets_generating` | `bg-purple-500/20 text-purple-400` |
| `assets_ready` | `bg-cyan-500/20 text-cyan-400` |
| `paid` | `bg-blue-500/20 text-blue-400` |
| `onboarding` | `bg-yellow-500/20 text-yellow-400` |
| `rejected` | `bg-red-500/20 text-red-400` |
| `no_business` | `bg-zinc-500/20 text-zinc-400` |

---

## Modals

> **Always use the Modal component module** — `src/components/modal.tsx`
> Never build modals from scratch. Import and compose from this module to guarantee consistency.

### Available exports

| Component | Purpose |
|---|---|
| `<Modal>` | Backdrop + card wrapper. Closes on Escape or backdrop click. |
| `<ModalHeader>` | Title + optional subtitle + close button |
| `<ModalTabs>` | Pill-style tab nav (matches admin dashboard tabs) |
| `<ModalBody>` | Content area with standard padding |
| `<ModalFooter>` | Footer with left slot (progress dots) + right slot (buttons + error) |
| `<ModalProgressDots>` | Step indicator dots for multi-tab modals |
| `<ConfirmModal>` | Pre-built confirm/cancel dialog (destructive or standard) |

### Basic tabbed modal example

```tsx
import {
  Modal, ModalHeader, ModalTabs, ModalBody, ModalFooter,
  ModalProgressDots, type ModalTab,
} from '@/components/modal';
import { IoPerson, IoBusiness } from 'react-icons/io5';

const TABS: ModalTab[] = [
  { id: 'account', label: 'Account', icon: IoPerson },
  { id: 'business', label: 'Business', icon: IoBusiness },
];

export function MyModal({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState('account');

  return (
    <Modal onClose={onClose}>
      <ModalHeader title="Add User" onClose={onClose} />
      <ModalTabs tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />
      <ModalBody>
        {activeTab === 'account' && <AccountFields />}
        {activeTab === 'business' && <BusinessFields />}
      </ModalBody>
      <ModalFooter left={<ModalProgressDots tabs={TABS} activeTab={activeTab} />} error={error}>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button className="bg-emerald-500 text-black hover:bg-emerald-400">Save</Button>
      </ModalFooter>
    </Modal>
  );
}
```

### Confirm dialog example

```tsx
import { ConfirmModal } from '@/components/modal';

<ConfirmModal
  title="Delete User"
  description="This will permanently delete the user and all their data."
  confirmLabel="Delete"
  destructive
  loading={deleting}
  onConfirm={handleDelete}
  onClose={() => setConfirming(false)}
/>
```

### Key rules
- Modal bg is `bg-zinc-900` — one step above the `bg-black` page
- Backdrop: `bg-black/80 backdrop-blur-sm` — strong enough to separate modal from page
- `ring-1 ring-zinc-700` provides the visible card edge
- `shadow-2xl` for depth
- `maxWidth` prop: `max-w-2xl` for forms (default), `max-w-md` for confirmations
- For long-form modals, use tabs (3 max) rather than scrolling
- Escape key and backdrop click always close the modal

---

## Forms

- Labels: `<Label>` component, `text-sm text-neutral-400` style
- Inputs: `<Input>` component with `className="mt-1"`
- Textareas: `<Textarea>` with `min-h-[80px]`
- Selects: shadcn `<Select>` component
- Field groups: `space-y-4` between fields
- Grid layouts: `grid gap-4 sm:grid-cols-2` for side-by-side fields

### Multi-Value List Input

For inputs that accept multiple values (emails, locations, tags), use a vertical list pattern:

```tsx
{/* Input row */}
<div className="flex gap-2">
  <Input
    value={inputValue}
    onChange={(e) => setInputValue(e.target.value)}
    onKeyDown={(e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addItem();
      }
    }}
    placeholder="Add item..."
    className="flex-1"
  />
  <Button type="button" variant="outline" onClick={addItem}>
    <IoAdd className="h-4 w-4" />
  </Button>
</div>

{/* List of values */}
{values.length > 0 && (
  <div className="mt-3 divide-y divide-zinc-800 rounded-lg border border-zinc-800">
    {values.map((item) => (
      <div key={item} className="flex items-center justify-between px-4 py-3">
        <span className="text-sm">{item}</span>
        <button
          type="button"
          onClick={() => removeItem(item)}
          className="text-neutral-500 hover:text-red-400"
        >
          <IoClose className="h-4 w-4" />
        </button>
      </div>
    ))}
  </div>
)}
```

Key styles:
- Input with add button at top
- Values displayed in bordered list below
- Each row: `flex items-center justify-between px-4 py-3`
- Dividers: `divide-y divide-zinc-800`
- Delete button: `text-neutral-500 hover:text-red-400`

### Sticky Save Footer

For multi-section form pages, use a sticky footer with a centered Save button:

```tsx
{/* Sticky Save Footer */}
<div className="sticky bottom-0 z-10 mt-6 flex justify-center py-4">
  <Button
    onClick={handleSave}
    disabled={saving}
    className="min-w-[130px] bg-emerald-500 text-black hover:bg-emerald-400 shadow-lg shadow-black/30 disabled:opacity-100 disabled:bg-emerald-600"
  >
    {saving ? 'Saving...' : 'Save Changes'}
  </Button>
</div>
```

Key styles:
- `sticky bottom-0 z-10` — sticks to bottom of scrollable container
- `flex justify-center` — centers button horizontally
- `min-w-[130px]` — prevents button from resizing when text changes
- `shadow-lg shadow-black/30` — subtle shadow for depth
- `disabled:opacity-100 disabled:bg-emerald-600` — keeps button visible (not transparent) when saving
- Place **outside** the last card, inside the main `<div className="space-y-6">` wrapper

---

## Icons

Library: **react-icons/io5** (Ionicons 5)

Common icons used:
| Icon | Use |
|---|---|
| `IoPeople` | Users |
| `IoBusiness` | Business / overview |
| `IoGlobe` | Website / domain |
| `IoImage` | Assets |
| `IoCreate` | Edit requests |
| `IoCard` | Payments |
| `IoColorPalette` | Branding / onboarding |
| `IoPlay` | Trigger / start action |
| `IoCheckmarkCircle` | Complete / success |
| `IoSearch` | Search inputs |
| `IoClose` | Modal close |
| `IoShield` | Admin role badge |
| `IoPerson` | User / account |
| `IoArrowBack` | Back navigation |
| `IoEye` | View / preview |
| `IoCloudUpload` | Upload |
| `IoTrash` | Delete |
| `IoPencil` | Edit |

Icon sizing: `h-4 w-4` inline, `h-5 w-5` in buttons/headers, `h-10 w-10` in stat card icon containers.

Icon containers in stat cards:
```tsx
<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20">
  <IoPeople className="h-5 w-5 text-blue-400" />
</div>
```

---

## Page Structure (Admin)

```
bg-black page
  └── <Container> (max-w-1440, px-8)
       ├── Header (title + subtitle)
       ├── Tab nav (pill style, border-b border-zinc-800)
       └── Tab content
            └── bg-zinc-900 rounded-xl cards
```

---

## Do's and Don'ts

**Do:**
- Use `rounded-xl` for all cards and modals
- Use pill-style tabs with icons everywhere
- Use `emerald` for primary actions and active states
- Keep modals tabbed when they have more than ~4 fields
- Use `text-neutral-400` for all secondary/label text
- Use `bg-zinc-900` for card surfaces, `bg-zinc-800` for nested/hover

**Don't:**
- Don't use underline/border-bottom tab styles
- Don't use `bg-zinc-800` as a modal background (too close to page bg)
- Don't use `rounded-2xl` — use `rounded-xl`
- Don't use white or light backgrounds anywhere (dark-only UI)
- Don't use `text-gray-*` — use `text-neutral-*` or `text-zinc-*`
- Don't add scrolling to modals — use tabs instead
