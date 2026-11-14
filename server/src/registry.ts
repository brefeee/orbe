/**
 * Points de rencontre entre modules. Un module ne lit jamais les tables d'un autre :
 * il passe par ce registre, ce qui garde les permissions à un seul endroit.
 */
export interface SearchHit {
  type: string;          // 'knowledge' | 'category' | 'conversation' | 'file' | 'user' | 'server' | 'post' | 'shared' …
  id: string;
  title: string;
  snippet?: string;
  /** Route interne du client, ex. '/carte/n/abc'. */
  route: string;
  score?: number;
  meta?: Record<string, unknown>;
}
export interface SearchProvider {
  type: string;
  /** Ne renvoie QUE ce que viewerId a le droit de voir : le filtrage se fait dans la requête SQL. */
  search(viewerId: string, query: string, limit: number): SearchHit[];
}

export interface AiTool {
  name: string;                       // ex. 'carte.search', 'reseau.create_channels'
  description: string;
  /** Schéma JSON des arguments, transmis tel quel aux modèles. */
  parameters: Record<string, unknown>;
  /** 'read' s'exécute sans confirmation ; 'write' et 'admin' demandent l'accord explicite de l'utilisateur. */
  level: 'read' | 'write' | 'admin';
  /** Vérifie les permissions de userId puis agit. Lève HttpError si l'action n'est pas permise. */
  run(userId: string, args: Record<string, unknown>): Promise<unknown> | unknown;
}

export interface Social {
  isFriend(a: string, b: string): boolean;
  /** Vrai si l'un a bloqué l'autre. */
  isBlocked(a: string, b: string): boolean;
  isServerMember(userId: string, serverId: string): boolean;
}

export interface Exporter { name: string; export(userId: string): unknown }

export class Registry {
  searchProviders: SearchProvider[] = [];
  aiTools: AiTool[] = [];
  /** Remplacé par le module réseau ; par défaut personne n'est ami ni membre. */
  social: Social = { isFriend: () => false, isBlocked: () => false, isServerMember: () => false };
  /** Appelés dans la transaction de suppression d'un compte, avant la suppression de la ligne users. */
  accountDeleteHooks: ((userId: string) => void)[] = [];
  exporters: Exporter[] = [];
  /** Droit de lecture d'un média selon ce à quoi il est rattaché (scope_type). Le propriétaire y a toujours accès. */
  mediaAccess: Record<string, (viewerId: string, scopeId: string) => boolean> = {};
}
