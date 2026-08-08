'use client';

import React, { useMemo, useState } from 'react';
import { BedDouble, DoorOpen, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { ActionMenu } from '@/components/ui/ActionMenu';
import { formatCurrency } from '@/lib/utils';
import {
  ROOM_STATE_LABELS,
  createRoom,
  removeRoom,
  updateRoom,
  type Room,
  type RoomInput,
  type RoomState,
} from '@/services/hospitalization.service';
import type { HospitalizationSettings } from '@/services/establishment.service';
import type { WriteContext } from '@/services/base.service';
import { Badge, EmptyState, Field, FIELD, Notice, ScrollTable } from './shared';

/**
 * Chambres (BP16 §6).
 *
 * Le type de chambre et le service proviennent des Paramètres de
 * l'établissement : BP16 §6 laisse chaque structure définir ses catégories, et
 * une saisie libre produirait autant de « Soins intensifs » que d'orthographes.
 */

const EMPTY: RoomInput = {
  code: '',
  name: '',
  roomType: '',
  service: '',
  floor: '',
  capacity: 1,
  dailyRate: 0,
  status: 'available',
  notes: '',
};

const roomTone = (room: Room): 'good' | 'warn' | 'bad' | 'neutral' => {
  if (room.status === 'closed') return 'bad';
  if (room.status === 'maintenance') return 'warn';
  if (room.bedCount > 0 && room.occupiedBeds >= room.bedCount) return 'warn';
  return 'good';
};

export const RoomsPanel: React.FC<{
  rooms: readonly Room[];
  settings: HospitalizationSettings;
  currency: string;
  canManage: boolean;
  ctx: WriteContext | null;
  onChanged: () => Promise<void>;
}> = ({ rooms, settings, currency, canManage, ctx, onChanged }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<Room | null>(null);
  const [form, setForm] = useState<RoomInput>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [search, setSearch] = useState('');

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return rooms;
    return rooms.filter((room) =>
      `${room.code} ${room.name ?? ''} ${room.roomType} ${room.service ?? ''}`
        .toLowerCase()
        .includes(needle),
    );
  }, [rooms, search]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...EMPTY,
      roomType: settings.roomTypes[0] ?? '',
      service: settings.admissionServices[0] ?? '',
      // Le tarif journalier des Paramètres sert de proposition : chaque chambre
      // peut ensuite porter le sien.
      dailyRate: settings.dailyRate,
    });
    setError(null);
    setIsOpen(true);
  };

  const openEdit = (room: Room) => {
    setEditing(room);
    setForm({
      code: room.code,
      name: room.name ?? '',
      roomType: room.roomType,
      service: room.service ?? '',
      floor: room.floor ?? '',
      capacity: room.capacity,
      dailyRate: room.dailyRate,
      status: room.status,
      notes: room.notes ?? '',
    });
    setError(null);
    setIsOpen(true);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!ctx) return;

    setIsSaving(true);
    setError(null);
    try {
      if (editing) {
        await updateRoom(editing.id, form, ctx.userId);
      } else {
        await createRoom(form, ctx);
      }
      await onChanged();
      setIsOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible.');
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async (room: Room) => {
    if (!ctx) return;
    setError(null);
    try {
      await removeRoom(room.id, ctx.userId);
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Retrait impossible.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          className={`${FIELD} sm:max-w-xs`}
          placeholder="Rechercher une chambre…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        {canManage && (
          <Button variant="secondary" onClick={openCreate} className="shrink-0 gap-2">
            <Plus className="h-4 w-4" /> Nouvelle chambre
          </Button>
        )}
      </div>

      {error && <Notice tone="error">{error}</Notice>}

      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
        {visible.length === 0 ? (
          <EmptyState
            icon={DoorOpen}
            title={rooms.length === 0 ? 'Aucune chambre enregistrée' : 'Aucun résultat'}
            description={
              rooms.length === 0
                ? "Les chambres sont la première brique du module : les lits s'y rattachent, et l'admission ne propose que ce qui existe."
                : 'Aucune chambre ne correspond à votre recherche.'
            }
            action={
              canManage && rooms.length === 0 ? (
                <Button variant="secondary" onClick={openCreate} className="mt-2 gap-2">
                  <Plus className="h-4 w-4" /> Créer la première chambre
                </Button>
              ) : undefined
            }
          />
        ) : (
          <ScrollTable minWidth="min-w-[52rem]">
            <thead className="bg-slate-950 font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="p-4">Référence</th>
                <th className="p-4">Numéro</th>
                <th className="p-4">Type</th>
                <th className="p-4">Service</th>
                <th className="p-4">Lits</th>
                <th className="p-4">Tarif / jour</th>
                <th className="p-4">État</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {visible.map((room) => (
                <tr key={room.id} className="transition-colors hover:bg-slate-800/50">
                  <td className="p-4 font-mono font-bold text-mora-green">{room.reference}</td>
                  <td className="p-4 font-bold text-white">
                    {room.code}
                    {room.name && <span className="block text-[11px] text-slate-500">{room.name}</span>}
                  </td>
                  <td className="p-4">{room.roomType}</td>
                  <td className="p-4">{room.service ?? '—'}</td>
                  <td className="p-4">
                    <span className="font-semibold text-slate-200">
                      {room.occupiedBeds} / {room.bedCount}
                    </span>
                    {room.bedCount < room.capacity && (
                      <span className="block text-[11px] text-slate-500">
                        Capacité {room.capacity}
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    {room.dailyRate > 0 ? formatCurrency(room.dailyRate, currency) : 'Non facturée'}
                  </td>
                  <td className="p-4">
                    <Badge label={ROOM_STATE_LABELS[room.status]} tone={roomTone(room)} />
                  </td>
                  <td className="p-4">
                    <ActionMenu
                      label={`Actions pour la chambre ${room.code}`}
                      items={[
                        {
                          label: 'Modifier',
                          icon: Pencil,
                          disabled: !canManage,
                          onSelect: () => openEdit(room),
                        },
                        {
                          label: 'Retirer du service',
                          icon: Trash2,
                          destructive: true,
                          disabled: !canManage,
                          onSelect: () => void remove(room),
                        },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </ScrollTable>
        )}
      </div>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={editing ? `Chambre ${editing.code}` : 'Nouvelle chambre'}
        description="Le type et le service proviennent des Paramètres de l’établissement."
      >
        <form onSubmit={submit} className="space-y-4">
          {error && <Notice tone="error">{error}</Notice>}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Numéro ou référence *" htmlFor="room-code">
              <input
                id="room-code"
                required
                className={FIELD}
                value={form.code}
                placeholder="204, A-12…"
                onChange={(event) => setForm({ ...form, code: event.target.value })}
              />
            </Field>
            <Field label="Nom (facultatif)" htmlFor="room-name">
              <input
                id="room-name"
                className={FIELD}
                value={form.name}
                placeholder="Chambre Maternité 1"
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Type de chambre *">
              <Select
                required
                value={form.roomType}
                onChange={(value) => setForm({ ...form, roomType: value })}
                options={settings.roomTypes.map((type) => ({ value: type, label: type }))}
              />
            </Field>
            <Field label="Service">
              <Select
                value={form.service ?? ''}
                onChange={(value) => setForm({ ...form, service: value })}
                placeholder="— Aucun service —"
                options={settings.admissionServices.map((service) => ({
                  value: service,
                  label: service,
                }))}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Étage" htmlFor="room-floor">
              <input
                id="room-floor"
                className={FIELD}
                value={form.floor}
                placeholder="RDC, 2e…"
                onChange={(event) => setForm({ ...form, floor: event.target.value })}
              />
            </Field>
            <Field
              label="Capacité (lits) *"
              htmlFor="room-capacity"
              hint="Le module refusera d’y créer davantage de lits."
            >
              <input
                id="room-capacity"
                type="number"
                min={1}
                max={40}
                required
                className={FIELD}
                value={form.capacity}
                onChange={(event) =>
                  setForm({ ...form, capacity: Math.max(1, Number(event.target.value) || 1) })
                }
              />
            </Field>
            <Field label={`Tarif journalier (${currency})`} htmlFor="room-rate">
              <input
                id="room-rate"
                type="number"
                min={0}
                className={FIELD}
                value={form.dailyRate}
                onChange={(event) =>
                  setForm({ ...form, dailyRate: Math.max(0, Number(event.target.value) || 0) })
                }
              />
            </Field>
          </div>

          <Field
            label="État de la chambre"
            hint="Une chambre fermée ou en maintenance ne reçoit plus d’admission."
          >
            <Select<RoomState>
              value={form.status}
              onChange={(value) => setForm({ ...form, status: value })}
              options={(Object.keys(ROOM_STATE_LABELS) as RoomState[])
                // « Complète » se constate, elle ne se décide pas.
                .filter((state) => state !== 'occupied')
                .map((state) => ({ value: state, label: ROOM_STATE_LABELS[state] }))}
            />
          </Field>

          <Field label="Observations" htmlFor="room-notes">
            <textarea
              id="room-notes"
              rows={2}
              className={FIELD}
              value={form.notes}
              onChange={(event) => setForm({ ...form, notes: event.target.value })}
            />
          </Field>

          <div className="flex flex-col gap-2 pt-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button type="submit" variant="secondary" isLoading={isSaving} className="flex-1 font-bold">
              {editing ? 'Enregistrer' : 'Créer la chambre'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export const RoomsSummary: React.FC<{ rooms: readonly Room[] }> = ({ rooms }) => (
  <p className="text-xs text-slate-400">
    <BedDouble className="mr-1 inline h-3.5 w-3.5" />
    {rooms.length} chambre(s), {rooms.reduce((total, room) => total + room.bedCount, 0)} lit(s).
  </p>
);
