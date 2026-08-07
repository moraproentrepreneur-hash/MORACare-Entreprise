'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  Stethoscope,
  BedDouble,
  FlaskConical,
  Binary,
  CreditCard,
  HeartPulse,
  ShieldAlert,
  Download,
  Eye,
} from 'lucide-react';
import { ModuleGuard } from '@/components/layouts/ModuleGuard';
import { useData } from '@/context/DataContext';
import { formatDate, formatDateTime, formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { useDocument } from '@/hooks/useDocument';
import type { DocumentPayload } from '@/lib/documents/pdf';

/**
 * Dossier Médical Partagé d'un patient (UG03 §6).
 *
 * Cette page matérialise l'interconnexion exigée par CLAUDE.md : toutes les
 * données rattachées au patient — consultations, examens, hospitalisations,
 * factures — sont réunies autour d'un même dossier.
 */

interface SectionProps {
  title: string;
  icon: React.ElementType;
  count: number;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, icon: Icon, count, children }) => (
  <section className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">
    <header className="px-5 py-3 border-b border-slate-800 flex items-center gap-2">
      <Icon className="w-4 h-4 text-mora-green" />
      <h3 className="text-sm font-bold text-white">{title}</h3>
      <span className="ml-auto text-[11px] font-mono text-slate-500">{count}</span>
    </header>
    <div className="divide-y divide-slate-800/70">
      {count === 0 ? (
        <p className="px-5 py-6 text-xs text-slate-500 text-center">Aucun élément enregistré.</p>
      ) : (
        children
      )}
    </div>
  </section>
);

const Row: React.FC<{ primary: string; secondary?: string; meta?: string }> = ({
  primary,
  secondary,
  meta,
}) => (
  <div className="px-5 py-3 flex items-start justify-between gap-4 text-xs">
    <div className="min-w-0">
      <p className="text-slate-200 font-semibold truncate">{primary}</p>
      {secondary && <p className="text-slate-500 truncate mt-0.5">{secondary}</p>}
    </div>
    {meta && <span className="text-slate-500 font-mono shrink-0">{meta}</span>}
  </div>
);

function PatientRecord() {
  const params = useParams();
  const patientId = String(params.id);

  const {
    patients,
    consultations,
    appointments,
    hospitalizations,
    labOrders,
    imagingOrders,
    invoices,
    isLoading,
  } = useData();

  const { print, preview, isGenerating, error: documentError } = useDocument();

  const patient = patients.find((p) => p.id === patientId);

  const related = useMemo(
    () => ({
      consultations: consultations.filter((c) => c.patient_id === patientId),
      appointments: appointments.filter((a) => a.patient_id === patientId),
      hospitalizations: hospitalizations.filter((h) => h.patient_id === patientId),
      labOrders: labOrders.filter((o) => o.patient_id === patientId),
      imagingOrders: imagingOrders.filter((o) => o.patient_id === patientId),
      invoices: invoices.filter((i) => i.patient_id === patientId),
    }),
    [patientId, consultations, appointments, hospitalizations, labOrders, imagingOrders, invoices],
  );

  /**
   * Contenu du dossier patient (BP28C §7).
   *
   * Composé avant les retours anticipés : un hook ne peut pas être appelé
   * conditionnellement. Le contenu est vide tant que le patient n'est pas
   * chargé, mais les boutons ne s'affichent de toute façon qu'ensuite.
   */
  const recordPayload = useMemo<DocumentPayload>(
    () => ({
      kind: 'patient_record',
      reference: patient?.business_reference ?? '—',
      title: 'Dossier patient',
      subtitle: patient
        ? `Édité le ${formatDate(new Date().toISOString())}`
        : undefined,
      highlight: patient
        ? [
            { label: 'Patient', value: `${patient.first_name} ${patient.last_name}` },
            { label: 'Date de naissance', value: formatDate(patient.birth_date) },
            { label: 'Sexe', value: patient.gender },
            { label: 'Groupe sanguin', value: patient.blood_group || 'Non renseigné' },
          ]
        : [],
      sections: patient
        ? [
            {
              title: 'Coordonnées',
              fields: [
                { label: 'Téléphone', value: patient.phone || 'Non renseigné' },
                { label: 'Adresse', value: patient.address || 'Non renseignée' },
              ],
            },
            {
              title: 'Informations médicales',
              fields: [
                {
                  label: 'Allergies',
                  value: patient.allergies?.length
                    ? patient.allergies.join(', ')
                    : 'Aucune allergie signalée',
                },
                {
                  label: 'Antécédents',
                  value: patient.chronic_conditions?.length
                    ? patient.chronic_conditions.join(', ')
                    : 'Aucun antécédent signalé',
                },
              ],
            },
            {
              title: 'Historique des consultations',
              table:
                related.consultations.length > 0
                  ? {
                      columns: ['Date', 'Praticien', 'Motif', 'Diagnostic'],
                      rows: related.consultations.map((c) => [
                        formatDate(c.consultation_date),
                        c.doctor_name || '—',
                        c.chief_complaint || '—',
                        c.diagnosis_summary || '—',
                      ]),
                    }
                  : undefined,
              paragraphs:
                related.consultations.length === 0
                  ? ['Aucune consultation enregistrée à ce jour.']
                  : undefined,
            },
            {
              title: 'Hospitalisations',
              table:
                related.hospitalizations.length > 0
                  ? {
                      columns: ['Admission', 'Sortie', 'Chambre', 'Motif'],
                      rows: related.hospitalizations.map((h) => [
                        formatDate(h.admission_date),
                        h.discharge_date ? formatDate(h.discharge_date) : 'En cours',
                        `${h.room_number} — ${h.bed_number}`,
                        h.admission_reason || '—',
                      ]),
                    }
                  : undefined,
              paragraphs:
                related.hospitalizations.length === 0
                  ? ['Aucune hospitalisation enregistrée à ce jour.']
                  : undefined,
            },
          ]
        : [],
      note:
        'Document confidentiel. Sa communication est réservée au patient et aux professionnels de santé autorisés.',
    }),
    [patient, related],
  );

  if (isLoading) {
    return <div className="h-40 rounded-2xl bg-slate-900 border border-slate-800 animate-pulse" />;
  }

  if (!patient) {
    return (
      <div className="p-12 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-4">
        <h3 className="text-xl font-bold text-white">Dossier introuvable</h3>
        <p className="text-xs text-slate-400">
          Ce patient n&apos;existe pas, ou il n&apos;appartient pas à votre établissement.
        </p>
        <Link href="/patients" className="inline-block text-xs text-mora-green hover:underline">
          Retour à la liste des patients
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/patients"
        className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Retour aux dossiers patients
      </Link>

      {/* Identité */}
      <div className="p-4 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs text-mora-green font-bold">
              {patient.business_reference}
            </p>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-1 break-words">
              {patient.first_name} {patient.last_name}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {patient.gender} · Né(e) le {formatDate(patient.birth_date)} · {patient.phone}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {patient.blood_group && (
              <div className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold">
                Groupe {patient.blood_group}
              </div>
            )}

            {/* BP28C §6 : un document est visualisable avant téléchargement. */}
            <Button
              variant="outline"
              size="sm"
              disabled={isGenerating}
              onClick={() => void preview(recordPayload)}
              className="gap-1.5"
            >
              <Eye className="w-3.5 h-3.5" /> Aperçu
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={isGenerating}
              onClick={() => void print(recordPayload)}
              className="gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> Télécharger
            </Button>
          </div>
        </div>

        {documentError && (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
            {documentError}
          </div>
        )}

        {(patient.allergies?.length || patient.chronic_conditions?.length) && (
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {patient.allergies && patient.allergies.length > 0 && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                <p className="flex items-center gap-2 text-[11px] font-bold text-amber-300 uppercase">
                  <ShieldAlert className="w-3.5 h-3.5" /> Allergies
                </p>
                <p className="mt-1 text-xs text-amber-200/90">{patient.allergies.join(', ')}</p>
              </div>
            )}
            {patient.chronic_conditions && patient.chronic_conditions.length > 0 && (
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <p className="flex items-center gap-2 text-[11px] font-bold text-slate-300 uppercase">
                  <HeartPulse className="w-3.5 h-3.5" /> Antécédents
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {patient.chronic_conditions.join(', ')}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Consultations" icon={Stethoscope} count={related.consultations.length}>
          {related.consultations.map((c) => (
            <Row
              key={c.id}
              primary={c.chief_complaint}
              secondary={`${c.doctor_name} · ${c.diagnosis_summary ?? 'Diagnostic non renseigné'}`}
              meta={formatDate(c.consultation_date)}
            />
          ))}
        </Section>

        <Section title="Rendez-vous" icon={Calendar} count={related.appointments.length}>
          {related.appointments.map((a) => (
            <Row
              key={a.id}
              primary={a.reason || 'Rendez-vous'}
              secondary={`${a.doctor_name} · ${a.status}`}
              meta={formatDateTime(a.appointment_date)}
            />
          ))}
        </Section>

        <Section title="Hospitalisations" icon={BedDouble} count={related.hospitalizations.length}>
          {related.hospitalizations.map((h) => (
            <Row
              key={h.id}
              primary={h.admission_reason}
              secondary={`Chambre ${h.room_number} · ${h.bed_number} · ${h.status}`}
              meta={formatDate(h.admission_date)}
            />
          ))}
        </Section>

        <Section title="Analyses biologiques" icon={FlaskConical} count={related.labOrders.length}>
          {related.labOrders.map((o) => (
            <Row
              key={o.id}
              primary={o.test_type}
              secondary={`${o.priority} · ${o.status}`}
              meta={formatDate(o.created_at)}
            />
          ))}
        </Section>

        <Section title="Imagerie médicale" icon={Binary} count={related.imagingOrders.length}>
          {related.imagingOrders.map((o) => (
            <Row
              key={o.id}
              primary={`${o.modality} — ${o.body_part}`}
              secondary={o.status}
              meta={formatDate(o.created_at)}
            />
          ))}
        </Section>

        <Section title="Facturation" icon={CreditCard} count={related.invoices.length}>
          {related.invoices.map((i) => (
            <Row
              key={i.id}
              primary={formatCurrency(i.total_amount)}
              secondary={`${i.business_reference} · ${i.status}`}
              meta={formatDate(i.invoice_date)}
            />
          ))}
        </Section>
      </div>
    </div>
  );
}

export default function PatientRecordPage() {
  return (
    <ModuleGuard module="patients">
      <PatientRecord />
    </ModuleGuard>
  );
}
