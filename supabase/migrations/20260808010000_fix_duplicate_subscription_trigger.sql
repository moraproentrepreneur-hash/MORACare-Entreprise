-- MORACare Enterprise - Correction du dédoublement de l'historique d'abonnement
-- Version: 2.8.1
--
-- La migration 20260808000000 créait `trig_subscription_events` sans supprimer
-- `trig_subscription_history`, posé par 20260801000000 sur la même table et
-- pour le même événement. Les deux déclencheurs cohabitaient : chaque création,
-- changement de statut ou changement de formule était donc inscrit deux fois
-- dans `subscription_events`.
--
-- Un historique qui compte double est pire qu'un historique absent : il donne
-- l'illusion d'événements qui n'ont pas eu lieu.
--
-- La migration d'origine a été corrigée pour les bases neuves ; celle-ci
-- rattrape les bases où elle a déjà été appliquée.

DROP TRIGGER IF EXISTS trig_subscription_events ON public.subscriptions;
DROP TRIGGER IF EXISTS trig_subscription_history ON public.subscriptions;

CREATE TRIGGER trig_subscription_history
  AFTER INSERT OR UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.log_subscription_change();

/*
 * Purge des doublons déjà écrits.
 *
 * Deux événements sont considérés identiques lorsqu'ils portent le même
 * abonnement, le même type, les mêmes statuts, les mêmes formules et le même
 * horodatage : les deux triggers s'exécutaient dans la même transaction, donc
 * à `created_at` identique. Seule la première ligne est conservée.
 */
DELETE FROM public.subscription_events a
 USING public.subscription_events b
 WHERE a.id > b.id
   AND a.subscription_id = b.subscription_id
   AND a.event_type = b.event_type
   AND a.created_at = b.created_at
   AND a.previous_status IS NOT DISTINCT FROM b.previous_status
   AND a.new_status IS NOT DISTINCT FROM b.new_status
   AND a.previous_plan_id IS NOT DISTINCT FROM b.previous_plan_id
   AND a.new_plan_id IS NOT DISTINCT FROM b.new_plan_id;
