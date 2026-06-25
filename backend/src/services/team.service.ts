import { teamRepository } from '../repositories/team.repository';
import type { AuthContext, TeamMember } from '../types/domain';
import { toTeamMember } from '../utils/mappers';
import { formatDisplayRole } from '../utils/permissions';

export class TeamService {
  async listMembers(auth: AuthContext): Promise<TeamMember[]> {
    const users = await teamRepository.listMembers(auth.organizationId);
    const invites = await teamRepository.listInvites(auth.organizationId);

    const activeMembers = users.map(toTeamMember);
    const invitedMembers: TeamMember[] = invites.map((invite) => ({
      id: invite.id,
      name: invite.email.split('@')[0],
      email: invite.email,
      role: formatDisplayRole(invite.role as 'owner' | 'admin' | 'member'),
      status: 'invited',
    }));

    return [...activeMembers, ...invitedMembers];
  }
}

export const teamService = new TeamService();
