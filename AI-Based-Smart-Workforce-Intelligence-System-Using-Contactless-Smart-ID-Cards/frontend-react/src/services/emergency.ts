import axios from 'axios';
import type {
  EvacuationEvent,
  EvacuationStats,
  EvacuationParticipant,
  ZoneSummary,
  VerificationRecord,
  HeadcountStatus,
} from '@models/emergency';

const req = axios.create({
  baseURL: '/api/emergency',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

const NO_ACTIVE: { active: false; evacuation: null; stats: null } = {
  active: false,
  evacuation: null,
  stats: null,
};

export const emergencyService = {
  getActiveEvacuation: async (): Promise<{
    active: boolean;
    evacuation: EvacuationEvent | null;
    stats: EvacuationStats | null;
  }> => {
    try {
      const { data } = await req.get('/evacuations/active');
      return data;
    } catch {
      return NO_ACTIVE;
    }
  },

  startEvacuation: async (params: {
    eventName: string;
    affectedZones?: string[];
    building?: string;
    floor?: string;
    notes?: string;
  }): Promise<{ success: boolean; evacuation: EvacuationEvent; stats: EvacuationStats }> => {
    const { data } = await req.post('/evacuations', params);
    return data;
  },

  getEvacuation: async (
    id: string
  ): Promise<{ evacuation: EvacuationEvent; stats: EvacuationStats }> => {
    const { data } = await req.get(`/evacuations/${id}`);
    return data;
  },

  closeEvacuation: async (
    id: string,
    reason?: string
  ): Promise<{ success: boolean; evacuation: EvacuationEvent; stats: EvacuationStats }> => {
    const { data } = await req.post(`/evacuations/${id}/close`, { reason });
    return data;
  },

  getHeadcount: async (
    id: string
  ): Promise<{ headcount: EvacuationParticipant[]; stats: EvacuationStats }> => {
    const { data } = await req.get(`/evacuations/${id}/headcount`);
    return data;
  },

  verifyPerson: async (
    evacuationId: string,
    params: {
      empId: string;
      status: HeadcountStatus;
      verificationMethod?: string;
      note?: string;
      notExpectedReason?: string;
    }
  ): Promise<{ success: boolean; changed: boolean; stats: EvacuationStats }> => {
    const { data } = await req.post(`/evacuations/${evacuationId}/verify`, params);
    return data;
  },

  getZoneSummary: async (id: string): Promise<ZoneSummary[]> => {
    const { data } = await req.get(`/evacuations/${id}/zones`);
    return data;
  },

  getAuditTrail: async (id: string, empId?: string): Promise<VerificationRecord[]> => {
    const params = empId ? `?empId=${encodeURIComponent(empId)}` : '';
    const { data } = await req.get(`/evacuations/${id}/audit${params}`);
    return data;
  },

  getHistory: async (): Promise<EvacuationEvent[]> => {
    const { data } = await req.get('/evacuations/history');
    return data;
  },

  startSimulation: async (): Promise<{
    success: boolean;
    message: string;
    evacuation: EvacuationEvent;
    stats: EvacuationStats;
    participantCount: number;
  }> => {
    const { data } = await req.post('/simulate');
    return data;
  },
};
