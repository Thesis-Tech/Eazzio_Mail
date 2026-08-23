export type FilterField = 'from' | 'to' | 'subject' | 'body' | 'header';
export type FilterOperator = 'contains' | 'equals' | 'starts_with' | 'ends_with' | 'matches_regex';
export type FilterActionType = 'apply_label' | 'move_to_folder' | 'mark_as_read' | 'star' | 'mark_important' | 'delete';

export interface FilterCondition {
  field: FilterField;
  operator: FilterOperator;
  value: string;
  headerName?: string;
}

export interface FilterAction {
  type: FilterActionType;
  value?: string; // label name/ID or folder name/ID
}

export interface FilterProps {
  id: string;
  mailboxId: string;
  name?: string;
  conditions: FilterCondition[];
  actions: FilterAction[];
  isEnabled: boolean;
  priority: number;
}

export class Filter {
  constructor(private readonly props: FilterProps) {}

  public get id(): string { return this.props.id; }
  public get mailboxId(): string { return this.props.mailboxId; }
  public get name(): string | undefined { return this.props.name; }
  public get conditions(): FilterCondition[] { return this.props.conditions; }
  public get actions(): FilterAction[] { return this.props.actions; }
  public get isEnabled(): boolean { return this.props.isEnabled; }
  public get priority(): number { return this.props.priority; }

  /**
   * Evaluates whether this filter matches a given message context.
   */
  public matches(context: {
    from: string;
    to: string[];
    subject: string;
    bodyText?: string;
    headers?: Record<string, string | string[]>;
  }): boolean {
    if (!this.props.isEnabled || this.props.conditions.length === 0) {
      return false;
    }

    return this.props.conditions.every((cond) => {
      let targetValue = '';
      if (cond.field === 'from') {
        targetValue = context.from || '';
      } else if (cond.field === 'to') {
        targetValue = context.to ? context.to.join(', ') : '';
      } else if (cond.field === 'subject') {
        targetValue = context.subject || '';
      } else if (cond.field === 'body') {
        targetValue = context.bodyText || '';
      } else if (cond.field === 'header' && cond.headerName && context.headers) {
        const hdr = context.headers[cond.headerName.toLowerCase()];
        targetValue = Array.isArray(hdr) ? hdr.join(', ') : hdr || '';
      }

      const matchVal = (cond.value || '').toLowerCase();
      const actualVal = targetValue.toLowerCase();

      switch (cond.operator) {
        case 'contains':
          return actualVal.includes(matchVal);
        case 'equals':
          return actualVal === matchVal;
        case 'starts_with':
          return actualVal.startsWith(matchVal);
        case 'ends_with':
          return actualVal.endsWith(matchVal);
        case 'matches_regex':
          try {
            return new RegExp(cond.value, 'i').test(targetValue);
          } catch {
            return false;
          }
        default:
          return false;
      }
    });
  }
}
