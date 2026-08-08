'use client';

import React, { useMemo, useState } from 'react';
import { BedDouble, Brush, CircleSlash, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { ActionMenu } from '@/components/ui/ActionMenu';
import { formatDate } from '@/lib/utils';
import {
  BED_STATE_LABELS,
  createBed,
  removeBed,
  setBedState,
  type Bed,
  type BedState,
  type Room,
} from '@/services/hospitalization.service';
import type { WriteContext } from '@/services/base.service';
import { Badge, EmptyState, Field, FIELD, Notice, ScrollTable } from './shared';

/**
 * Lits (BP16 §7).
 *
 * L'état « occupé » n'apparaît pas dans les choix : il découle de l'affectation
 * d'un séjour et la base le tient elle-même. Le proposer laisserait croire
 * qu'un lit peut être déclaré occupé sans patient, et ouvrirait une divergence
 * entre l'état affiché et la réalité du service.
 */

const bedTone = (bed: Bed): 'good' | 'warn' | 'bad' | 'info' | 'neutral' => {
  if (bed.status === 'occupied') return 'info';
  if (bed.status === 'out_of_service') return 'bad';
  if (bed.status === 'cleaning' || bed.status === 'reserved') return 'warn';
  return 'good';
};

type Filter = 'all' | 'assignable' | 'occupied' | 'unavailable';

export const BedsPanel: React.FC<{
  beds: readonly Bed[];
  rooms: readonly Room[];
  canManage: boolean;
  ctx: WriteContext | null;
  onChanged: () => Promise<void>;
}> = ({ beds, rooms, canManage, ctx, onChanged }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [roomFilter, setRoomFilter] = useState('all');

  const [form, setForm] = useState({ roomId: '', code: '', status: 'available' as BedState });

  const visible = useMemo(
    () =>
      beds
        .filter((bed) => (roomFilter === 'all' ? true : bed.roomId === roomFilter))
        .filter((bed) => {
          if (filter === 'assignable') return bed.isAssignable;
          if (filter === 'occupied') return bed.hospitalizationId !== null;
          if (filter === 'unavailable') {
            return bed.status === 'out_of_service' || bed.status === 'cleaning';
          }
          return true;
        }),
    [beds, filter, roomFilter],
  );

  const openCreate = () => {
    setForm({ roomId: rooms[0]?.id ?? '', code: '', status: 'available' });
    setError(null);
    setIsOpen(true);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!ctx) return;

    setIsSaving(true);
    setError(null);
    try {
      await createBed(form, ctx);
      await onChanged();
      setIsOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Création impossible.');
    } finally {
      setIsSaving(false);
    }
  };

  const changeState = async (bed: Bed, status: Exclude<BedState, 'occupied'>) => {
    if (!ctx) return;
    setError(null);
    try {
      await setBedState(bed.id, status, ctx.userId);
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mise à jour impossible.');
    }
  };

  const remove = async (bed: Bed) => {
    if (!ctx) return;
    setError(null);
    try {
      await removeBed(bed.id, ctx.userId);
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Retrait impossible.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto]">
        <Select<Filter>
          aria-label="Filtrer les lits"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'Tous les lits' },
            { value: 'assignable', label: 'Disponibles à l’admission' },
            { value: 'occupied', label: 'Occupés' },
            { value: 'unavailable', label: 'Indisponibles' },
          ]}
        />
        <Select
          aria-label="Filtrer par chambre"
          value={roomFilter}
          onChange={setRoomFilter}
          options={[
            { value: 'all', label: 'Toutes les chambres' },
            ...rooms.map((room) => ({
              value: room.id,
              label: `Chambre ${room.code}`,
              hint: room.roomType,
            })),
          ]}
        />
        {canManage && (
          <Button
            variant="secondary"
            onClick={openCreate}
            disabled={rooms.length === 0}
            className="gap-2"
          >
            <Plus className="h-4 w-4" /> Nouveau lit
          </Button>
        )}
      </div>

      {error && <Notice tone="error">{error}</Notice>}

      {rooms.length === 0 && (
        <Notice tone="info">
          Créez d’abord une chambre : un lit est toujours rattaché à l’une d’elles.
        </Notice>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">
        {visible.length === 0 ? (
          <EmptyState
            icon={BedDouble}
            title={beds.length === 0 ? 'Aucun lit enregistré' : 'Aucun lit ne correspond'}
            description={
              beds.length === 0
                ? "Sans lit, aucune admission n'est possible : le formulaire ne propose que des lits réellement disponibles."
                : 'Modifiez les filtres pour élargir la recherche.'
            }
          />
        ) : (
          <ScrollTable minWidth="min-w-[48rem]">
            <thead className="bg-slate-950 font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="p-4">Référence</th>
                <th className="p-4">Chambre</th>
                <th className="p-4">Lit</th>
                <th className="p-4">Service</th>
                <th className="p-4">État</th>
                <th className="p-4">Occupant</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {visible.map((bed) => (
                <tr key={bed.id} className="transition-colors hover:bg-slate-800/50">
                  <td className="p-4 font-mono font-bold text-mora-green">{bed.reference}</td>
                  <td className="p-4">
                    <span className="font-bold text-white">{bed.roomCode}</span>
                    <span className="block text-[11px] text-slate-500">{bed.roomType}</span>
                  </td>
                  <td className="p-4 font-bold text-mora-gold">{bed.code}</td>
                  <td className="p-4">{bed.service ?? '—'}</td>
                  <td className="p-4">
                    <Badge label={BED_STATE_LABELS[bed.status]} tone={bedTone(bed)} />
                    {bed.availableFrom && bed.status !== 'occupied' && (
                      <span className="mt-1 block text-[11px] text-slate-500">
                        Depuis le {formatDate(bed.availableFrom)}
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    {bed.patientName ? (
                      <>
                        <span className="font-semibold text-slate-200">{bed.patientName}</span>
                        {bed.admissionDate && (
                          <span className="block text-[11px] text-slate-500">
                            Admis le {formatDate(bed.admissionDate)}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-slate-500">Libre</span>
                    )}
                  </td>
                  <td className="p-4">
                    <ActionMenu
                      label={`Actions pour le lit ${bed.roomCode}-${bed.code}`}
                      items={[
                        {
                          label: 'Déclarer disponible',
                          icon: RotateCcw,
                          disabled: !canManage || bed.status === 'occupied' || bed.status === 'available',
                          onSelect: () => void changeState(bed, 'available'),
                        },
                        {
                          label: 'Mettre en nettoyage',
                          icon: Brush,
                          disabled: !canManage || bed.status === 'occupied',
                          onSelect: () => void changeState(bed, 'cleaning'),
                        },
                        {
                          label: 'Déclarer hors service',
                          icon: CircleSlash,
                          disabled: !canManage || bed.status === 'occupied',
                          onSelect: () => void changeState(bed, 'out_of_service'),
                        },
                        {
                          label: 'Retirer le lit',
                          icon: Trash2,
                          destructive: true,
                          disabled: !canManage || bed.status === 'occupied',
                          onSelect: () => void remove(bed),
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

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Nouveau lit">
        <form onSubmit={submit} className="space-y-4">
          {error && <Notice tone="error">{error}</Notice>}

          <Field label="Chambre *">
            <Select
              required
              value={form.roomId}
              onChange={(value) => setForm({ ...form, roomId: value })}
              options={rooms.map((room) => ({
                value: room.id,
                label: `Chambre ${room.code}`,
                hint: `${room.roomType} · ${room.bedCount}/${room.capacity} lit(s)`,
                disabled: room.bedCount >= room.capacity,
              }))}
            />
          </Field>

          <Field
            label="Numéro du lit *"
            htmlFor="bed-code"
            hint="Unique dans la chambre : « A », « B », « 1 »…"
          >
            <input
              id="bed-code"
              required
              className={FIELD}
              value={form.code}
              onChange={(event) => setForm({ ...form, code: event.target.value })}
            />
          </Field>

          <Field label="État initial">
            <Select<BedState>
              value={form.status}
              onChange={(value) => setForm({ ...form, status: value })}
              options={(Object.keys(BED_STATE_LABELS) as BedState[])
                .filter((state) => state !== 'occupied')
                .map((state) => ({ value: state, label: BED_STATE_LABELS[state] }))}
            />
          </Field>

          <div className="flex flex-col gap-2 pt-2 sm:flex-row">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="flex-1">
              Annuler
            </Button>
            <Button type="submit" variant="secondary" isLoading={isSaving} className="flex-1 font-bold">
              Créer le lit
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
