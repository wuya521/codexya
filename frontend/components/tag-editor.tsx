"use client";

import { useState } from "react";

type TagEditorProps = {
  label: string;
  placeholder: string;
  items: string[];
  onChange: (items: string[]) => void;
};

export function TagEditor({
  label,
  placeholder,
  items,
  onChange
}: TagEditorProps) {
  const [value, setValue] = useState("");

  const addItem = () => {
    const next = value.trim();
    if (!next) {
      return;
    }
    onChange([...items, next]);
    setValue("");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-medium text-ink">{label}</label>
        <span className="text-xs tracking-[0.16em] text-muted">
          Enter 添加
        </span>
      </div>
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addItem();
            }
          }}
          className="input-base"
          placeholder={placeholder}
        />
        <button type="button" className="button-secondary" onClick={addItem}>
          添加
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.length === 0 ? (
          <p className="text-sm text-muted">还没有添加内容。</p>
        ) : (
          items.map((item, index) => (
            <button
              key={`${item}-${index}`}
              type="button"
              onClick={() =>
                onChange(items.filter((_, current) => current !== index))
              }
              className="rounded-full border border-line bg-canvas px-3 py-1 text-sm text-ink transition hover:border-brand/35 hover:text-brand"
            >
              {item} · 移除
            </button>
          ))
        )}
      </div>
    </div>
  );
}
