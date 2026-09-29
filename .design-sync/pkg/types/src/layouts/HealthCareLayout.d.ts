import { type ReactNode } from "react";
export type HealthCareUser = {
    name: string;
    avatarUrl?: string;
    units: string[];
};
export declare function HealthCareLayout({ currentPath, currentHealthCareUser, currentUnit, onNavigate, flash, children, }: {
    currentPath?: string;
    currentHealthCareUser?: HealthCareUser;
    currentUnit?: string;
    onNavigate?: (to: string) => void;
    flash?: ReactNode;
    children: ReactNode;
}): import("react").JSX.Element;
