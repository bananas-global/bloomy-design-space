import * as React from 'react';

/**
 * BackofficeLayout — from bloomy-design-space@0.1.0.
 */
export interface BackofficeLayoutProps {
  /** Numa tela de feature, o `context` que ela recebe do motor. */
  context?: LayoutContext;
  /** `@current_path`: decide o item ativo do menu. */
  currentPath?: string;
  /** `@page_breadcrumbs`. */
  breadcrumbs?: BreadcrumbItem[];
  /** `@hide_menu`. */
  hideMenu?: boolean;
  currentUser?: CurrentUser;
  /** `@current_unit.name`. Padrão: a primeira unidade da pessoa. */
  currentUnit?: string;
  /** `@current_assistance`: com ele o cabeçalho mostra o `timer/1`. */
  currentAssistance?: TimerCustomService;
  /** Relógio de referência do `timer/1` (ISO). */
  now?: string;
  notifications?: UserNotification[];
  /** `Bloomy.University.enabled?()`. */
  universityEnabled?: boolean;
  /** Onde o `flash_group/1` do layout fica. */
  flash?: React.ReactNode;
  children: React.ReactNode;
}

export declare const BackofficeLayout: React.ComponentType<BackofficeLayoutProps>;
