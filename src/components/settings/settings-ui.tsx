'use client';

import React, { useRef, useState } from 'react';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';

/**
 * Éléments partagés par les écrans de paramétrage.
 *
 * L'établissement et la plateforme règlent la même chose — modèle documentaire,
 * en-tête, signature, cachet, couleurs — sur deux niveaux distincts. Les deux
 * écrans utilisent donc les mêmes composants : deux copies auraient divergé, et
 * le Super Admin aurait fini par régler ses documents dans une interface
 * subtilement différente de celle qu'il explique à ses clients.
 */

export const FIELD =
  'w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-mora-green disabled:opacity-60';

export const Panel: React.FC<{
  title: string;
  description?: string;
  icon?: React.ElementType;
  children: React.ReactNode;
}> = ({ title, description, icon: Icon, children }) => (
  <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
    <div>
      <h4 className="flex items-center gap-2 text-sm font-bold text-white">
        {Icon && <Icon className="h-4 w-4 shrink-0 text-mora-green" />}
        {title}
      </h4>
      {description && <p className="mt-1 text-xs text-slate-400">{description}</p>}
    </div>
    {children}
  </section>
);

export const Field: React.FC<{
  label: string;
  htmlFor: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}> = ({ label, htmlFor, hint, required, children }) => (
  <div>
    <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-semibold text-slate-300">
      {label} {required && <span className="text-mora-green">*</span>}
    </label>
    {children}
    {hint && <p className="mt-1 text-[11px] text-slate-500">{hint}</p>}
  </div>
);

/**
 * Vignette d'un modèle.
 *
 * Une miniature en HTML, et non une image : elle reprend les couleurs saisies,
 * de sorte que le choix se fasse sur le rendu réel de l'émetteur et non sur une
 * capture générique.
 */
export const TemplatePreview: React.FC<{
  templateId: string;
  primary: string;
  secondary: string;
}> = ({ templateId, primary, secondary }) => (
  <div className="h-20 overflow-hidden rounded-lg border border-slate-800 bg-white">
    {templateId === 'premium_classic' && (
      <>
        <div className="h-6" style={{ backgroundColor: primary }} />
        <div className="space-y-1 p-1.5">
          <div className="h-1 w-1/2 rounded-full bg-slate-300" />
          <div className="h-1 w-full rounded-full bg-slate-200" />
          <div className="h-1 w-4/5 rounded-full bg-slate-200" />
        </div>
      </>
    )}

    {templateId === 'premium_medical' && (
      <>
        <div className="h-5 bg-slate-100" />
        <div className="h-0.5" style={{ backgroundColor: secondary }} />
        <div className="space-y-1 p-1.5">
          <div className="h-3 w-full rounded" style={{ backgroundColor: `${secondary}22` }} />
          <div className="h-1 w-full rounded-full bg-slate-200" />
          <div className="h-1 w-3/5 rounded-full bg-slate-200" />
        </div>
      </>
    )}

    {templateId === 'premium_executive' && (
      <div className="space-y-1 p-1.5">
        <div className="h-1.5 w-2/3 rounded-full" style={{ backgroundColor: primary }} />
        <div className="h-0.5 w-full" style={{ backgroundColor: primary }} />
        <div className="h-px w-full" style={{ backgroundColor: secondary }} />
        <div className="h-1 w-full rounded-full bg-slate-200" />
        <div className="h-1 w-5/6 rounded-full bg-slate-200" />
        <div className="h-1 w-2/3 rounded-full bg-slate-200" />
      </div>
    )}
  </div>
);

export const ColorField: React.FC<{
  label: string;
  id: string;
  value: string;
  editable: boolean;
  onChange: (value: string) => void;
}> = ({ label, id, value, editable, onChange }) => (
  <Field label={label} htmlFor={id}>
    <div className="flex items-center gap-2">
      <input
        id={id}
        type="color"
        disabled={!editable}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-14 shrink-0 cursor-pointer rounded-lg border border-slate-700 bg-slate-800 disabled:opacity-60"
      />
      <input
        aria-label={`${label} en hexadécimal`}
        disabled={!editable}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${FIELD} font-mono uppercase`}
      />
    </div>
  </Field>
);

/**
 * Dépôt d'un visuel : logo, signature, cachet.
 *
 * Le téléversement est confié à l'appelant. L'établissement dépose dans un
 * dossier qui lui est propre, la plateforme dans son propre compartiment : le
 * composant n'a pas à connaître cette distinction, et la lui imposer aurait
 * obligé à le dupliquer.
 */
export const AssetField: React.FC<{
  label: string;
  hint: string;
  url: string;
  editable: boolean;
  upload: (file: File) => Promise<string>;
  onChange: (url: string) => void;
  onError: (message: string) => void;
  wide?: boolean;
}> = ({ label, hint, url, editable, upload, onChange, onError, wide }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFile = async (file: File) => {
    setIsUploading(true);
    try {
      onChange(await upload(file));
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Téléversement impossible.');
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold text-slate-300">{label}</p>

      <div
        className={`flex items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-700 bg-slate-950 ${
          wide ? 'h-24' : 'h-24 sm:h-28'
        }`}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={label} className="max-h-full max-w-full object-contain" />
        ) : (
          <span className="flex flex-col items-center gap-1 text-slate-600">
            <ImagePlus className="h-6 w-6" />
            <span className="text-[10px]">Aucun fichier</span>
          </span>
        )}
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
        <button
          type="button"
          disabled={!editable || isUploading}
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 transition-colors hover:bg-slate-700 disabled:opacity-50"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Envoi…
            </>
          ) : (
            <>
              <ImagePlus className="h-3.5 w-3.5" /> {url ? 'Remplacer' : 'Téléverser'}
            </>
          )}
        </button>

        {url && editable && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-red-400 transition-colors hover:bg-red-500/20"
          >
            <Trash2 className="h-3.5 w-3.5" /> Retirer
          </button>
        )}
      </div>

      <p className="mt-1 text-[11px] text-slate-500">{hint}</p>
    </div>
  );
};
