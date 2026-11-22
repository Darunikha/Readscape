import { useState } from 'react';
import { BookCheck, BookMarked, BookOpen, Check, ChevronDown, FolderPlus, Plus, Trash2 } from 'lucide-react';
import Popover, { MenuDivider, MenuItem, MenuLabel } from '../ui/Popover';
import { useShelf } from '../../context/ShelfContext';
import { useConfirm } from '../../context/ConfirmContext';
import { useToast } from '../../context/ToastContext';
import { cn, SHELVES } from '../../lib/utils';
import { Spinner } from '../ui';

const STATUS_ICONS = { reading: BookOpen, read: BookCheck, want: BookMarked };

/** The shelf menu body: default shelves, custom shelves, remove. */
function ShelfMenu({ book, close }) {
  const { statusOf, setStatus, removeFromShelves, customShelves, toggleCustom, createShelf } = useShelf();
  const confirm = useConfirm();
  const toast = useToast();
  const status = statusOf(book.olId);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const choose = async (s) => {
    close();
    if (s !== status) await setStatus(book, s).catch(() => {});
  };

  const remove = async () => {
    close();
    const ok = await confirm({
      title: 'Remove from your shelves?',
      message: `“${book.title}” and its reading progress will be removed from your bookshelf. Your review (if any) is kept.`,
      confirmLabel: 'Remove',
      danger: true,
    });
    if (ok) removeFromShelves(book);
  };

  const create = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const shelf = await createShelf(newName.trim());
      await toggleCustom({ ...shelf, olIds: [] }, book);
      setNewName('');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <MenuLabel>Shelves</MenuLabel>
      {Object.values(SHELVES).map((s) => (
        <MenuItem key={s.key} icon={status === s.key ? Check : STATUS_ICONS[s.key]} active={status === s.key} onClick={() => choose(s.key)}>
          {s.label}
        </MenuItem>
      ))}
      <MenuDivider />
      <MenuLabel>My collections</MenuLabel>
      <div className="max-h-44 overflow-y-auto">
        {customShelves.length === 0 && <p className="px-3 py-1 text-[13px] text-cocoa-400">No custom shelves yet</p>}
        {customShelves.map((shelf) => {
          const on = shelf.olIds.includes(book.olId);
          return (
            <MenuItem key={shelf._id} icon={on ? Check : Plus} active={on} onClick={() => toggleCustom(shelf, book)}>
              {shelf.name}
            </MenuItem>
          );
        })}
      </div>
      <form onSubmit={create} className="flex items-center gap-1.5 px-1.5 pt-1.5">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          maxLength={40}
          placeholder="New shelf…"
          aria-label="New shelf name"
          className="min-w-0 flex-1 rounded-lg border border-cocoa/12 bg-oat-100/60 px-2.5 py-1.5 text-[13px] outline-none focus:border-silver-600"
        />
        <button type="submit" className="icon-btn size-8 bg-mist/70" disabled={!newName.trim() || creating} aria-label="Create shelf">
          {creating ? <Spinner /> : <FolderPlus className="size-4" />}
        </button>
      </form>
      {status && (
        <>
          <MenuDivider />
          <MenuItem icon={Trash2} danger onClick={remove}>Remove from shelves</MenuItem>
        </>
      )}
    </div>
  );
}

/**
 * Add-to-shelf control.
 * variant="full": labelled button (book page). variant="icon": round button on covers.
 */
export default function ShelfButton({ book, variant = 'full', className }) {
  const { statusOf, setStatus } = useShelf();
  const status = statusOf(book.olId);
  const [busy, setBusy] = useState(false);

  if (variant === 'icon') {
    return (
      <Popover
        align="end"
        width={250}
        trigger={(open) => (
          <button
            type="button"
            aria-label={status ? `On shelf: ${SHELVES[status].label}. Change shelf` : 'Add to shelf'}
            className={cn(
              'inline-flex size-8 items-center justify-center rounded-full border shadow-soft transition',
              status ? 'border-cocoa bg-cocoa text-oat-50' : 'border-cocoa/15 bg-oat-50/95 text-cocoa hover:bg-oat-50',
              open && 'ring-3 ring-mist',
              className,
            )}
          >
            {status ? <Check className="size-4" /> : <Plus className="size-4" />}
          </button>
        )}
      >
        {(close) => <ShelfMenu book={book} close={close} />}
      </Popover>
    );
  }

  const quickAdd = async () => {
    setBusy(true);
    await setStatus(book, 'want').catch(() => {});
    setBusy(false);
  };

  const Icon = status ? STATUS_ICONS[status] : BookMarked;
  return (
    <div className={cn('inline-flex', className)}>
      <button
        type="button"
        onClick={status ? undefined : quickAdd}
        disabled={busy}
        className={cn(
          'inline-flex items-center gap-2 rounded-l-full py-2.5 pr-4 pl-5 text-sm font-medium transition',
          status ? 'cursor-default bg-mist text-cocoa-800' : 'bg-cocoa text-oat-50 hover:bg-cocoa-700',
        )}
      >
        {busy ? <Spinner /> : <Icon className="size-4" />}
        {status ? SHELVES[status].label : 'Want to Read'}
      </button>
      <Popover
        width={260}
        trigger={(open) => (
          <button
            type="button"
            aria-label="Choose shelf"
            className={cn(
              'inline-flex h-full items-center rounded-r-full border-l px-3 transition',
              status ? 'border-cocoa/10 bg-mist text-cocoa hover:bg-mist-300' : 'border-oat-50/25 bg-cocoa text-oat-50 hover:bg-cocoa-700',
              open && 'ring-3 ring-mist',
            )}
          >
            <ChevronDown className={cn('size-4 transition', open && 'rotate-180')} />
          </button>
        )}
      >
        {(close) => <ShelfMenu book={book} close={close} />}
      </Popover>
    </div>
  );
}
