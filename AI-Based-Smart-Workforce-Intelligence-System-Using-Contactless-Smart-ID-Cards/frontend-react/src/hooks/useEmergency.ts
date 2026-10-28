import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { emergencyService } from '@services/emergency';
import type { HeadcountStatus } from '@models/emergency';

const POLL_INTERVAL = 5000;

export function useActiveEvacuation() {
  return useQuery({
    queryKey: ['emergency', 'active'],
    queryFn: emergencyService.getActiveEvacuation,
    refetchInterval: POLL_INTERVAL,
  });
}

export function useEvacuationHeadcount(evacuationId: string | null) {
  return useQuery({
    queryKey: ['emergency', 'headcount', evacuationId],
    queryFn: () => emergencyService.getHeadcount(evacuationId!),
    enabled: !!evacuationId,
    refetchInterval: POLL_INTERVAL,
  });
}

export function useZoneSummary(evacuationId: string | null) {
  return useQuery({
    queryKey: ['emergency', 'zones', evacuationId],
    queryFn: () => emergencyService.getZoneSummary(evacuationId!),
    enabled: !!evacuationId,
    refetchInterval: POLL_INTERVAL,
  });
}

export function useAuditTrail(evacuationId: string | null) {
  return useQuery({
    queryKey: ['emergency', 'audit', evacuationId],
    queryFn: () => emergencyService.getAuditTrail(evacuationId!),
    enabled: !!evacuationId,
    refetchInterval: POLL_INTERVAL,
  });
}

export function useStartEvacuation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: emergencyService.startEvacuation,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['emergency'] });
    },
  });
}

export function useCloseEvacuation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      emergencyService.closeEvacuation(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['emergency'] });
    },
  });
}

export function useStartSimulation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: emergencyService.startSimulation,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['emergency'] });
    },
  });
}

export function useVerifyPerson(evacuationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      empId: string;
      status: HeadcountStatus;
      verificationMethod?: string;
      note?: string;
      notExpectedReason?: string;
    }) => emergencyService.verifyPerson(evacuationId, params),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['emergency'] });
    },
  });
}
