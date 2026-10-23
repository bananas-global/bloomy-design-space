import { Avatar } from "bloomy-design-space";

export const Tamanhos = () => (
  <div className="flex flex-wrap items-end gap-3">
    {(["extra_small", "small", "medium", "extra_medium", "large", "extra_large"] as const).map((size) => (
      <Avatar key={size} size={size} title={size} />
    ))}
  </div>
);

export const CustomESquare = () => (
  <div className="flex flex-wrap items-end gap-3">
    <Avatar size="custom" className="h-8 w-8" title="custom" />
    <Avatar shape="square" size="large" title="square" />
    <Avatar shape="square" size="medium" title="square medium" />
  </div>
);
