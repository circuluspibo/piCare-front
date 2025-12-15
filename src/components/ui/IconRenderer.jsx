import * as React from "react";

import * as LucideIcons from "lucide-react";

// LucidIcon Renderer
const IconRenderer = React.forwardRef(({ icon, ...props }, ref) => {
  const IconComponent = LucideIcons[icon];
  return (
    <IconComponent ref={ref} size={'size-20'}{...props} />
  );
});
IconRenderer.displayName = "IconRenderer";

export { IconRenderer };
