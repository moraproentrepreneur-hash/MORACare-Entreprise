'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { MessagesSquare, Mail, Phone, MessageCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { formatDate } from '@/lib/utils';
import { Modal } from '@/components/ui/Modal';
import {
  listContactRequests,
  setContactRequestStatus,
  type ContactRequest,
} from '@/services/saas-requests.service';
import type { RequestStatus } from '@/types/database';
import {
  SearchField,
  SortableHeader,
  StatusBadge,
  StatusFilter,
  StatusSelect,
  compareValues,
  nextSort,
} from './request-ui';

/**
 * Messages du formulaire Contact / Support de la vitrine.
 *
 * Le message complet s'ouvre en fenêtre : le tronquer dans la cellule évite un
 * tableau déformé par un pavé de texte, mais il doit rester lisible en entier.
 */

type SortColumn = 'reference' | 'fullName' | 'subject' | 'createdAt' | 'status';

export const ContactRequestsPanel: React.FC = () => {
  const { user } = useAuth();

  const [contacts, setContacts] = useState<ContactRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [opened, setOpened] = useState<ContactRequest | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<RequestStatus | 'all'>('all');
  const [sort, setSort] = useState<{ column: SortColumn; direction: 'asc' | 'desc' }>({
    column: 'createdAt',
    direction: 'desc',
  });

  const load = useCallback(async () => {
    try {
      setContacts(await listContactRequests());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chargement impossible.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleStatus = async (contact: ContactRequest, status: RequestStatus) => {
    if (!user || status === contact.status) return;
    setSavingId(contact.id);
    setError(null);
    try {
      await setContactRequestStatus(contact.id, status, user.id);
      setContacts((list) =>
        list.map((item) => (item.id === contact.id ? { ...item, status } : item)),
      );
      setOpened((current) => (current && current.id === contact.id ? { ...current, status } : current));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mise à jour impossible.');
    } finally {
      setSavingId(null);
    }
  };

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return contacts
      .filter((contact) => statusFilter === 'all' || contact.status === statusFilter)
      .filter(
        (contact) =>
          needle === '' ||
          `${contact.reference} ${contact.fullName} ${contact.email} ${contact.phone} ${contact.subject}`
            .toLowerCase()
            .includes(needle),
      )
      .sort((a, b) => compareValues(a[sort.column], b[sort.column], sort.direction));
  }, [contacts, search, statusFilter, sort]);

  const pendingCount = contacts.filter((contact) => contact.status === 'pending').length;
  const handleSort = (column: SortColumn) => setSort((current) => nextSort(current, column));

  /** Réponse directe sur WhatsApp lorsque le visiteur a laissé un numéro. */
  const whatsappHref = (contact: ContactRequest): string => {
    const digits = contact.phone.replace(/\D/g, '');
    const text = `Bonjour ${contact.fullName}, nous faisons suite à votre message « ${contact.subject} » (référence ${contact.reference}).`;
    return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
        <h2 className="flex items-center gap-2 text-lg font-bold text-white sm:text-xl">
          <MessagesSquare className="h-5 w-5 shrink-0 text-mora-green" /> Prises de contact
        </h2>
        <p className="mt-1 text-xs text-slate-400">
          Messages reçus via le formulaire Contact et Support de la Landing Page.
          {pendingCount > 0 && (
            <span className="ml-1 font-semibold text-amber-400">
              {pendingCount} sans réponse.
            </span>
          )}
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-400">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <SearchField
          value={search}
          onChange={setSearch}
          placeholder="Rechercher par référence, nom, e-mail, sujet…"
        />
        <StatusFilter value={statusFilter} onChange={setStatusFilter} />
      </div>

      {/* Vue mobile */}
      <div className="space-y-3 md:hidden">
        {isLoading && <p className="py-8 text-center text-xs text-slate-500">Chargement…</p>}

        {!isLoading && visible.length === 0 && (
          <p className="py-8 text-center text-xs text-slate-500">Aucun message à afficher.</p>
        )}

        {visible.map((contact) => (
          <article
            key={contact.id}
            className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900 p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-mono text-[11px] font-bold text-mora-green">{contact.reference}</p>
                <p className="truncate text-sm font-bold text-white">{contact.subject}</p>
                <p className="truncate text-xs text-slate-400">{contact.fullName}</p>
              </div>
              <StatusBadge status={contact.status} />
            </div>

            <p className="text-[11px] text-slate-500">{formatDate(contact.createdAt)}</p>

            <button
              type="button"
              onClick={() => setOpened(contact)}
              className="w-full rounded-lg bg-slate-950 p-3 text-left text-[11px] leading-relaxed text-slate-400 hover:text-slate-200"
            >
              <span className="line-clamp-3">{contact.message}</span>
              <span className="mt-1 block font-semibold text-mora-green">Lire le message</span>
            </button>

            <div className="flex flex-wrap gap-3 text-xs">
              <a
                href={`mailto:${contact.email}`}
                className="inline-flex items-center gap-1.5 text-mora-green hover:underline"
              >
                <Mail className="h-3.5 w-3.5" /> {contact.email}
              </a>
              {contact.phone && (
                <a
                  href={`tel:${contact.phone}`}
                  className="inline-flex items-center gap-1.5 text-slate-300 hover:underline"
                >
                  <Phone className="h-3.5 w-3.5" /> {contact.phone}
                </a>
              )}
            </div>

            <StatusSelect
              value={contact.status}
              disabled={savingId === contact.id}
              aria-label={`Statut du message ${contact.reference}`}
              onChange={(status) => void handleStatus(contact, status)}
            />
          </article>
        ))}
      </div>

      {/* Vue large */}
      <div className="hidden overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <SortableHeader column="reference" label="Référence" sort={sort} onSort={handleSort} />
                <SortableHeader column="fullName" label="Nom" sort={sort} onSort={handleSort} />
                <th scope="col" className="p-4">
                  E-mail
                </th>
                <th scope="col" className="p-4">
                  Téléphone
                </th>
                <SortableHeader column="subject" label="Sujet" sort={sort} onSort={handleSort} />
                <th scope="col" className="p-4">
                  Message
                </th>
                <SortableHeader column="createdAt" label="Date" sort={sort} onSort={handleSort} />
                <SortableHeader column="status" label="Statut" sort={sort} onSort={handleSort} />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {isLoading && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    Chargement…
                  </td>
                </tr>
              )}

              {!isLoading && visible.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    Aucun message à afficher.
                  </td>
                </tr>
              )}

              {visible.map((contact) => (
                <tr key={contact.id} className="align-top hover:bg-slate-800/50">
                  <td className="whitespace-nowrap p-4 font-mono font-bold text-mora-green">
                    {contact.reference}
                  </td>
                  <td className="p-4 font-bold text-white">{contact.fullName}</td>
                  <td className="p-4">
                    <a href={`mailto:${contact.email}`} className="text-mora-green hover:underline">
                      {contact.email}
                    </a>
                  </td>
                  <td className="whitespace-nowrap p-4">
                    {contact.phone ? (
                      <a href={`tel:${contact.phone}`} className="hover:text-white hover:underline">
                        {contact.phone}
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="p-4">{contact.subject}</td>
                  <td className="p-4">
                    <button
                      type="button"
                      onClick={() => setOpened(contact)}
                      className="max-w-[18rem] truncate text-left text-slate-400 hover:text-white hover:underline"
                    >
                      {contact.message}
                    </button>
                  </td>
                  <td className="whitespace-nowrap p-4">{formatDate(contact.createdAt)}</td>
                  <td className="p-4">
                    <StatusSelect
                      value={contact.status}
                      disabled={savingId === contact.id}
                      aria-label={`Statut du message ${contact.reference}`}
                      onChange={(status) => void handleStatus(contact, status)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={opened !== null}
        onClose={() => setOpened(null)}
        title={opened?.subject ?? ''}
        description={opened ? `${opened.fullName} — ${formatDate(opened.createdAt)}` : ''}
        maxWidth="xl"
      >
        {opened && (
          <div className="space-y-4">
            <p className="font-mono text-xs text-mora-green">{opened.reference}</p>

            <p className="whitespace-pre-line rounded-xl bg-slate-950 p-4 text-sm leading-relaxed text-slate-300">
              {opened.message}
            </p>

            <div className="flex flex-wrap gap-2">
              <a
                href={`mailto:${opened.email}?subject=${encodeURIComponent(`Re: ${opened.subject}`)}`}
                className="inline-flex items-center gap-2 rounded-xl bg-mora-green px-4 py-2 text-xs font-bold text-white hover:bg-mora-green/90"
              >
                <Mail className="h-4 w-4" /> Répondre par e-mail
              </a>
              {opened.phone && (
                <a
                  href={whatsappHref(opened)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-4 py-2 text-xs font-bold text-white hover:bg-[#20bd5a]"
                >
                  <MessageCircle className="h-4 w-4" /> Répondre sur WhatsApp
                </a>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-300">
                Statut du dossier
              </label>
              <StatusSelect
                value={opened.status}
                disabled={savingId === opened.id}
                aria-label="Statut du message"
                onChange={(status) => void handleStatus(opened, status)}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
