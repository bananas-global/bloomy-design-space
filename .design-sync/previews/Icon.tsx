import { Icon } from "bloomy-design-space";

const NAV = ["fa-chart-pie", "fa-calendar-day", "fa-users", "fa-memo-circle-check", "fa-clock", "fa-bullhorn"];

export const Regular = () => (
  <div className="flex items-center gap-4 text-2xl text-brand-purple-dark">
    {NAV.map((n) => (
      <Icon key={n} name={n} />
    ))}
  </div>
);

export const Solid = () => (
  <div className="flex items-center gap-4 text-2xl text-brand-blue">
    {NAV.map((n) => (
      <Icon key={n} name={n} type="solid" />
    ))}
  </div>
);

export const ComCor = () => (
  <div className="flex items-center gap-4 text-xl">
    <Icon name="fa-check" className="text-green" />
    <Icon name="fa-times" className="text-red" />
    <Icon name="fa-triangle-exclamation" className="text-orange" />
    <Icon name="fa-solid fa-bullhorn" className="text-brand-accent" />
  </div>
);
