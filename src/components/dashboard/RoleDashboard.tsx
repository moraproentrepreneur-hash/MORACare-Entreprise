'use client';

import React, { useMemo } from 'react';
import {
  Users,
  Calendar,
  Stethoscope,
  BedDouble,
  Pill,
  FlaskConical,
  Binary,
  CreditCard,
  UserCheck,
  AlertTriangle,
  Clock,
  FileCheck2,
  Banknote,
  PackageX,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { StatCard } from './StatCard';
import { formatCurrency } from '@/lib/utils';

/**
 * Tableau de bord propre à chaque rôle.
 *
 * Les indicateurs reprennent littéralement ceux des guides utilisateurs :
 * UG02 §4 (responsable), UG03 §4 (médecin), UG04 §4 (infirmier),
 * UG05 §4 (réceptionniste), UG06 §4 (pharmacien), UG07 §4 (laboratoire),
 * UG08 §4 (imagerie), UG09 §4 (comptable).
 *
 * Le Super Admin n'apparaît pas ici : son tableau de bord vit dans l'espace
 * /admin, dont il ne sort jamais (BP06 §10 bis).
 */

const isSameDay = (iso: string | undefined, reference: Date): boolean => {
  if (!iso) return false;
  const d = new Date(iso);
  return (
    d.getFullYear() === reference.getFullYear() &&
    d.getMonth() === reference.getMonth() &&
    d.getDate() === reference.getDate()
  );
};

export const RoleDashboard: React.FC = () => {
  const { user } = useAuth();
  const {
    patients,
    appointments,
    consultations,
    hospitalizations,
    pharmacyItems,
    labOrders,
    imagingOrders,
    invoices,
    employees,
    cashRegisters,
    isLoading,
  } = useData();

  const stats = useMemo(() => {
    const today = new Date();

    const activeHospitalizations = hospitalizations.filter((h) => h.status === 'active');
    const todayConsultations = consultations.filter((c) => isSameDay(c.consultation_date, today));
    const todayAppointments = appointments.filter((a) => isSameDay(a.appointment_date, today));
    const upcomingAppointments = appointments.filter(
      (a) => new Date(a.appointment_date) >= today && a.status !== 'canceled',
    );
    const waitingPatients = appointments.filter(
      (a) => a.status === 'confirmed' || a.status === 'in_progress',
    );
    const canceledAppointments = appointments.filter((a) => a.status === 'canceled');

    const pendingLab = labOrders.filter((o) => o.status === 'pending');
    const inProgressLab = labOrders.filter((o) => o.status === 'in_progress');
    const urgentLab = labOrders.filter((o) => o.priority !== 'routine' && o.status !== 'completed');
    const completedLab = labOrders.filter((o) => o.status === 'completed');

    const pendingImaging = imagingOrders.filter((o) => o.status === 'pending');
    const completedImaging = imagingOrders.filter((o) => o.status === 'completed');
    const reportsToWrite = imagingOrders.filter((o) => o.status === 'completed' && !o.report_text);

    const outOfStock = pharmacyItems.filter((i) => i.stock_quantity <= 0);
    const lowStock = pharmacyItems.filter(
      (i) => i.stock_quantity > 0 && i.stock_quantity <= i.reorder_level,
    );
    const nearExpiry = pharmacyItems.filter((i) => {
      if (!i.expiry_date) return false;
      const days = (new Date(i.expiry_date).getTime() - today.getTime()) / 86_400_000;
      return days <= 90 && days >= 0;
    });

    const unpaidInvoices = invoices.filter((i) => i.status === 'pending' || i.status === 'partially_paid');
    const todayRevenue = invoices
      .filter((i) => isSameDay(i.invoice_date, today))
      .reduce((sum, i) => sum + i.paid_amount, 0);
    const openRegisterBalance = cashRegisters
      .filter((r) => r.status === 'open')
      .reduce((sum, r) => sum + r.current_balance, 0);

    return {
      activeHospitalizations,
      todayConsultations,
      todayAppointments,
      upcomingAppointments,
      waitingPatients,
      canceledAppointments,
      pendingLab,
      inProgressLab,
      urgentLab,
      completedLab,
      pendingImaging,
      completedImaging,
      reportsToWrite,
      outOfStock,
      lowStock,
      nearExpiry,
      unpaidInvoices,
      todayRevenue,
      openRegisterBalance,
    };
  }, [
    appointments,
    consultations,
    hospitalizations,
    pharmacyItems,
    labOrders,
    imagingOrders,
    invoices,
    cashRegisters,
  ]);

  const cards = useMemo(() => {
    switch (user?.role) {
      // UG02 §4
      case 'establishment_admin':
        return [
          { label: 'Patients enregistrés', value: patients.length, icon: Users },
          { label: 'Consultations du jour', value: stats.todayConsultations.length, icon: Stethoscope },
          { label: 'Rendez-vous', value: stats.upcomingAppointments.length, icon: Calendar },
          { label: 'Hospitalisations', value: stats.activeHospitalizations.length, icon: BedDouble },
          { label: 'Personnel', value: employees.length, icon: UserCheck },
          { label: 'Factures', value: invoices.length, icon: CreditCard },
          {
            label: 'Recettes du jour',
            value: formatCurrency(stats.todayRevenue),
            icon: Banknote,
            tone: 'success' as const,
          },
          {
            label: 'Alertes',
            value: stats.outOfStock.length + stats.unpaidInvoices.length,
            icon: AlertTriangle,
            tone: 'warning' as const,
            hint: 'Ruptures de stock et impayés',
          },
        ];

      // UG03 §4
      case 'doctor':
        return [
          { label: 'Consultations du jour', value: stats.todayConsultations.length, icon: Stethoscope },
          { label: 'Rendez-vous à venir', value: stats.upcomingAppointments.length, icon: Calendar },
          { label: 'Patients hospitalisés', value: stats.activeHospitalizations.length, icon: BedDouble },
          {
            label: 'Patients en attente',
            value: stats.waitingPatients.length,
            icon: Clock,
            tone: 'warning' as const,
          },
          {
            label: "Résultats d'examens disponibles",
            value: stats.completedLab.length + stats.completedImaging.length,
            icon: FileCheck2,
            tone: 'success' as const,
          },
        ];

      // UG04 §4
      case 'nurse':
        return [
          { label: 'Patients assignés', value: patients.length, icon: Users },
          { label: 'Hospitalisations en cours', value: stats.activeHospitalizations.length, icon: BedDouble },
          { label: 'Consultations du jour', value: stats.todayConsultations.length, icon: Stethoscope },
          {
            label: 'Alertes médicales',
            value: stats.urgentLab.length,
            icon: AlertTriangle,
            tone: 'danger' as const,
            hint: 'Examens urgents en cours',
          },
        ];

      // UG05 §4
      case 'receptionist':
        return [
          { label: 'Rendez-vous du jour', value: stats.todayAppointments.length, icon: Calendar },
          {
            label: 'Patients en attente',
            value: stats.waitingPatients.length,
            icon: Clock,
            tone: 'warning' as const,
          },
          { label: 'Nouvelles admissions', value: stats.activeHospitalizations.length, icon: BedDouble },
          { label: 'Patients enregistrés', value: patients.length, icon: Users },
          {
            label: 'Rendez-vous annulés',
            value: stats.canceledAppointments.length,
            icon: AlertTriangle,
            tone: 'danger' as const,
          },
        ];

      // UG06 §4
      case 'pharmacist':
        return [
          { label: 'Articles en stock', value: pharmacyItems.length, icon: Pill },
          {
            label: 'Médicaments en rupture',
            value: stats.outOfStock.length,
            icon: PackageX,
            tone: 'danger' as const,
          },
          {
            label: 'Sous le seuil de réappro.',
            value: stats.lowStock.length,
            icon: AlertTriangle,
            tone: 'warning' as const,
          },
          {
            label: 'Proches de la péremption',
            value: stats.nearExpiry.length,
            icon: Clock,
            tone: 'warning' as const,
            hint: 'Dans les 90 jours',
          },
        ];

      // UG07 §4
      case 'lab_tech':
        return [
          { label: 'Examens en attente', value: stats.pendingLab.length, icon: FlaskConical },
          { label: 'Analyses en cours', value: stats.inProgressLab.length, icon: Clock },
          {
            label: 'Examens urgents',
            value: stats.urgentLab.length,
            icon: AlertTriangle,
            tone: 'danger' as const,
          },
          {
            label: 'Résultats validés',
            value: stats.completedLab.length,
            icon: FileCheck2,
            tone: 'success' as const,
          },
        ];

      // UG08 §4
      case 'radiologist':
        return [
          { label: 'Examens programmés', value: stats.pendingImaging.length, icon: Binary },
          { label: 'Examens réalisés', value: stats.completedImaging.length, icon: FileCheck2 },
          {
            label: 'Comptes rendus à rédiger',
            value: stats.reportsToWrite.length,
            icon: Clock,
            tone: 'warning' as const,
          },
        ];

      // UG09 §4
      case 'accountant':
        return [
          {
            label: 'Recettes du jour',
            value: formatCurrency(stats.todayRevenue),
            icon: Banknote,
            tone: 'success' as const,
          },
          {
            label: 'Factures impayées',
            value: stats.unpaidInvoices.length,
            icon: AlertTriangle,
            tone: 'danger' as const,
          },
          { label: 'Factures émises', value: invoices.length, icon: CreditCard },
          {
            label: 'Situation de caisse',
            value: formatCurrency(stats.openRegisterBalance),
            icon: Banknote,
            hint: 'Caisses ouvertes',
          },
        ];

      default:
        return [];
    }
  }, [user?.role, patients, employees, invoices, pharmacyItems, stats]);

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-slate-900 border border-slate-800 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="p-4 sm:p-6 rounded-2xl bg-slate-900 border border-slate-800">
        <h2 className="text-xl font-bold text-white">
          Bonjour {user?.first_name}
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Voici l&apos;activité de votre établissement aujourd&apos;hui.
        </p>
      </div>

      {cards.length === 0 ? (
        <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center text-sm text-slate-400">
          Aucun indicateur n&apos;est défini pour votre rôle.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <StatCard key={card.label} {...card} />
          ))}
        </div>
      )}
    </div>
  );
};
