import { apiDelete, apiGet, apiPatch, apiPost } from "@/lib/api";
import type {
  ActivityItem,
  ApiMessage,
  Invitation,
  Role,
  Space,
  SpaceMember,
  TemplateId,
} from "@/types";

/** Wire shape from FastAPI (snake_case) — mapped once, here. */
interface SpaceWire {
  id: string;
  owner_id: string;
  name: string;
  template_id: string;
  icon: string;
  color: string;
  modules: string[];
  created_at: string;
  role: Role;
}

const toSpace = (w: SpaceWire): Space => ({
  id: w.id,
  ownerId: w.owner_id,
  name: w.name,
  templateId: w.template_id as TemplateId,
  icon: w.icon,
  color: w.color,
  modules: w.modules,
  createdAt: w.created_at,
  role: w.role,
});

export const listSpaces = async (): Promise<Space[]> =>
  (await apiGet<SpaceWire[]>("/spaces")).map(toSpace);

export const createSpace = async (input: {
  name: string;
  templateId: TemplateId;
  icon: string;
  color: string;
  modules: string[];
}): Promise<Space> =>
  toSpace(
    await apiPost<SpaceWire>("/spaces", {
      name: input.name,
      template_id: input.templateId,
      icon: input.icon,
      color: input.color,
      modules: input.modules,
    }),
  );

export const deleteSpace = (id: string) => apiDelete<ApiMessage>(`/spaces/${id}`);

/* --------------------------------- members --------------------------------- */

export const listMembers = (spaceId: string) =>
  apiGet<SpaceMember[]>(`/spaces/${spaceId}/members`);

export const updateMemberRole = (spaceId: string, userId: string, role: Role) =>
  apiPatch<ApiMessage>(`/spaces/${spaceId}/members/${userId}`, { role });

export const removeMember = (spaceId: string, userId: string) =>
  apiDelete<ApiMessage>(`/spaces/${spaceId}/members/${userId}`);

/* ------------------------------- invitations ------------------------------- */

export const inviteToSpace = (spaceId: string, email: string | null, role: Role) =>
  apiPost<Invitation>(`/spaces/${spaceId}/invitations`, { email, role });

export const listSpaceInvitations = (spaceId: string) =>
  apiGet<Invitation[]>(`/spaces/${spaceId}/invitations`);

export const listMyInvitations = () => apiGet<Invitation[]>("/invitations");

export const acceptInvitation = (id: string) =>
  apiPost<ApiMessage>(`/invitations/${id}/accept`);

export const declineInvitation = (id: string) =>
  apiPost<ApiMessage>(`/invitations/${id}/decline`);

export const redeemInvite = (code: string) =>
  apiPost<ApiMessage>("/invitations/redeem", { code });

export const listActivity = () => apiGet<ActivityItem[]>("/activity");
