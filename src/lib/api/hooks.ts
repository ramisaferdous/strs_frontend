"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type { Dashboard, Market, Property, SavePayload, SubmitResult, Submission, Underwriting } from "./types";

export const keys = {
  dashboard: ["dashboard"] as const,
  property: (zpid: string) => ["property", zpid] as const,
  market: (id: number) => ["market", id] as const,
  underwriting: (id: number) => ["underwriting", id] as const,
  submissions: (zpid?: string) => ["submissions", zpid ?? "all"] as const,
  submission: (id: number) => ["submission", id] as const,
};

export const useDashboard = () => useQuery({ queryKey: keys.dashboard, queryFn: () => api<Dashboard>("/api/dashboard") });

export const useProperty = (zpid: string) =>
  useQuery({ queryKey: keys.property(zpid), queryFn: () => api<Property>(`/api/properties/${zpid}`) });

export const useMarket = (id: number | null | undefined) =>
  useQuery({
    queryKey: keys.market(id ?? 0),
    queryFn: () => api<Market>(`/api/markets/${id}`),
    enabled: id != null,
  });

export const useUnderwriting = (id: number) =>
  useQuery({
    queryKey: keys.underwriting(id),
    queryFn: () => api<Underwriting>(`/api/underwritings/${id}`),
    // The form owns the live values once loaded; don't refetch under it.
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

export const useSubmissions = (zpid?: string) =>
  useQuery({
    queryKey: keys.submissions(zpid),
    queryFn: () => api<Submission[]>(`/api/submissions${zpid ? `?zpid=${zpid}` : ""}`),
  });

export const useSubmission = (id: number) =>
  useQuery({ queryKey: keys.submission(id), queryFn: () => api<Submission>(`/api/submissions/${id}`) });

export function useStartUnderwriting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (zpid: string) => api<Underwriting>("/api/underwritings", { method: "POST", json: { zpid } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.dashboard }),
  });
}

export function useSaveUnderwriting(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SavePayload) => api<Underwriting>(`/api/underwritings/${id}`, { method: "PUT", json: payload }),
    // The draft is cached forever (the form owns live values), so keep the cache
    // equal to what the server last accepted, or "Continue draft" would reopen stale data.
    onSuccess: (saved) => {
      qc.setQueryData(keys.underwriting(id), saved);
      qc.invalidateQueries({ queryKey: keys.dashboard });
    },
  });
}

export function useSubmitUnderwriting(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: SavePayload) =>
      api<SubmitResult>(`/api/underwritings/${id}/submit`, { method: "POST", json: payload }),
    onSuccess: (result) => {
      qc.setQueryData(keys.underwriting(id), result.underwriting);
      qc.setQueryData(keys.dashboard, result.dashboard);
      qc.setQueryData(keys.submission(result.submission.id), result.submission);
      qc.invalidateQueries({ queryKey: ["submissions"] });
    },
  });
}
