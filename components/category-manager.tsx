"use client";

import { useState, useTransition } from "react";
import { CheckIcon, PencilIcon, PlusIcon, Trash2Icon, XIcon } from "lucide-react";
import { toast } from "sonner";
import {
  createCategory,
  createSubcategory,
  deleteCategory,
  deleteSubcategory,
  renameSubcategory,
  updateCategory,
} from "@/actions/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CATEGORY_COLORS, nextCategoryColor } from "@/lib/colors";
import type { CategoryWithSubs } from "@/lib/data";
import type { Subcategory } from "@/lib/database.types";
import { cn } from "@/lib/utils";
import { safe } from "@/lib/safe";

type Usage = { categories: Record<string, number>; subcategories: Record<string, number> };

const usedBy = (n: number) => `${n} ${n === 1 ? "task" : "tasks"}`;

export function CategoryManager({ categories, usage }: { categories: CategoryWithSubs[]; usage: Usage }) {
  return (
    <div className="grid gap-4">
      <AddCategory used={categories.map((c) => c.color)} />
      {categories.length === 0 ? (
        <div className="rounded-2xl border border-dashed px-6 py-12 text-center">
          <p className="font-medium">No categories yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Try Study, Work, Health or Side project.</p>
        </div>
      ) : (
        <ul className="grid gap-3">
          {categories.map((c) => (
            <CategoryItem key={c.id} category={c} usage={usage} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ColorPicker({ value, onChange, label }: { value: string; onChange: (hex: string) => void; label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label={label}
            className="flex size-9 shrink-0 items-center justify-center rounded-lg border outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        }
      >
        <span className="size-4 rounded-full" style={{ backgroundColor: value }} />
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2">
        <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="Colors">
          {CATEGORY_COLORS.map((c) => (
            <button
              key={c.hex}
              type="button"
              role="radio"
              aria-checked={value === c.hex}
              aria-label={c.name}
              onClick={() => {
                onChange(c.hex);
                setOpen(false);
              }}
              className="flex size-9 items-center justify-center rounded-lg outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <span className="flex size-6 items-center justify-center rounded-full text-white" style={{ backgroundColor: c.hex }}>
                {value === c.hex && <CheckIcon className="size-3.5" strokeWidth={3} />}
              </span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function AddCategory({ used }: { used: (string | null)[] }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(() => nextCategoryColor(used));
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="flex gap-2 rounded-2xl border bg-card p-3"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const result = await safe(createCategory({ name, color }));
          if (result.ok) {
            setName("");
            setColor(nextCategoryColor([...used, color]));
          } else toast.error(result.error);
        });
      }}
    >
      <ColorPicker value={color} onChange={setColor} label="Category color" />
      <label htmlFor="new-category" className="sr-only">
        New category name
      </label>
      <Input id="new-category" value={name} onChange={(e) => setName(e.target.value)} placeholder="New category" maxLength={60} className="h-9" required />
      <Button type="submit" className="h-9" disabled={pending || !name.trim()}>
        <PlusIcon /> Add
      </Button>
    </form>
  );
}

function CategoryItem({ category, usage }: { category: CategoryWithSubs; usage: Usage }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.name);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [newSub, setNewSub] = useState("");
  const [pending, startTransition] = useTransition();
  const count = usage.categories[category.id] ?? 0;
  const color = category.color ?? CATEGORY_COLORS[0].hex;

  const save = (next: { name?: string; color?: string }) =>
    startTransition(async () => {
      const result = await safe(updateCategory(category.id, { name: next.name ?? category.name, color: next.color ?? color }));
      if (result.ok) setEditing(false);
      else toast.error(result.error);
    });

  const remove = () =>
    startTransition(async () => {
      const result = await safe(deleteCategory(category.id));
      if (result.ok) toast.success(`Deleted “${category.name}”`);
      else toast.error(result.error);
      setConfirmDelete(false);
    });

  const addSub = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const result = await safe(createSubcategory({ categoryId: category.id, name: newSub }));
      if (result.ok) setNewSub("");
      else toast.error(result.error);
    });
  };

  return (
    <li className="rounded-2xl border bg-card p-3 md:p-4">
      <div className="flex items-center gap-2">
        <ColorPicker value={color} onChange={(hex) => save({ color: hex })} label={`Color for ${category.name}`} />
        {editing ? (
          <form
            className="flex flex-1 gap-1"
            onSubmit={(e) => {
              e.preventDefault();
              save({ name });
            }}
          >
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} className="h-9" autoFocus aria-label="Category name" />
            <Button type="submit" size="icon" className="size-9" disabled={pending} aria-label="Save name">
              <CheckIcon />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-9"
              onClick={() => {
                setName(category.name);
                setEditing(false);
              }}
              aria-label="Cancel"
            >
              <XIcon />
            </Button>
          </form>
        ) : (
          <>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{category.name}</p>
              <p className="text-xs text-muted-foreground">{count ? `Used by ${usedBy(count)}` : "Not used yet"}</p>
            </div>
            <Button size="icon" variant="ghost" className="size-9" onClick={() => setEditing(true)} aria-label={`Rename ${category.name}`}>
              <PencilIcon />
            </Button>
            <Button size="icon" variant="ghost" className="size-9" onClick={() => setConfirmDelete(true)} aria-label={`Delete ${category.name}`}>
              <Trash2Icon />
            </Button>
          </>
        )}
      </div>

      {confirmDelete && (
        <div role="alert" className={cn("mt-3 flex flex-wrap items-center gap-2 rounded-lg px-3 py-2 text-sm", count ? "bg-muted" : "bg-destructive/10")}>
          {count ? (
            <>
              <p className="flex-1">
                {usedBy(count)} {count === 1 ? "uses" : "use"} this category. Move or delete {count === 1 ? "it" : "them"} first.
              </p>
              <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>
                OK
              </Button>
            </>
          ) : (
            <>
              <p className="flex-1">Delete “{category.name}” and its subcategories?</p>
              <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
              <Button size="sm" variant="destructive" onClick={remove} disabled={pending}>
                Delete
              </Button>
            </>
          )}
        </div>
      )}

      <div className="mt-3 ml-11 grid gap-1">
        {category.subcategories.map((s) => (
          <SubcategoryItem key={s.id} sub={s} count={usage.subcategories[s.id] ?? 0} />
        ))}
        <form onSubmit={addSub} className="flex gap-1.5 pt-1">
          <label htmlFor={`new-sub-${category.id}`} className="sr-only">
            New subcategory for {category.name}
          </label>
          <Input
            id={`new-sub-${category.id}`}
            value={newSub}
            onChange={(e) => setNewSub(e.target.value)}
            placeholder="Add subcategory"
            maxLength={60}
            className="h-8"
          />
          <Button type="submit" size="sm" variant="outline" className="h-8" disabled={pending || !newSub.trim()}>
            <PlusIcon /> Add
          </Button>
        </form>
      </div>
    </li>
  );
}

function SubcategoryItem({ sub, count }: { sub: Subcategory; count: number }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(sub.name);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  if (editing) {
    return (
      <form
        className="flex gap-1"
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(async () => {
            const result = await safe(renameSubcategory(sub.id, name));
            if (result.ok) setEditing(false);
            else toast.error(result.error);
          });
        }}
      >
        <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} className="h-8" autoFocus aria-label="Subcategory name" />
        <Button type="submit" size="icon-sm" className="size-8" disabled={pending} aria-label="Save name">
          <CheckIcon />
        </Button>
        <Button type="button" size="icon-sm" variant="ghost" className="size-8" onClick={() => setEditing(false)} aria-label="Cancel">
          <XIcon />
        </Button>
      </form>
    );
  }

  return (
    <div className="group flex min-h-8 items-center gap-2 rounded-md px-2 text-sm hover:bg-muted/60">
      <span className="flex-1 truncate">{sub.name}</span>
      {confirming ? (
        count ? (
          <>
            <span className="text-xs text-muted-foreground">Used by {usedBy(count)}, can&apos;t delete</span>
            <Button size="icon-sm" variant="ghost" onClick={() => setConfirming(false)} aria-label="Close">
              <XIcon />
            </Button>
          </>
        ) : (
          <>
            <Button
              size="sm"
              variant="destructive"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await safe(deleteSubcategory(sub.id));
                  if (!result.ok) toast.error(result.error);
                })
              }
            >
              Delete
            </Button>
            <Button size="icon-sm" variant="ghost" onClick={() => setConfirming(false)} aria-label="Cancel">
              <XIcon />
            </Button>
          </>
        )
      ) : (
        <>
          <span className="text-xs text-muted-foreground tabular-nums">{count ? usedBy(count) : ""}</span>
          <Button
            size="icon-sm"
            variant="ghost"
            className="md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
            onClick={() => setEditing(true)}
            aria-label={`Rename ${sub.name}`}
          >
            <PencilIcon />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            className="md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
            onClick={() => setConfirming(true)}
            aria-label={`Delete ${sub.name}`}
          >
            <Trash2Icon />
          </Button>
        </>
      )}
    </div>
  );
}
