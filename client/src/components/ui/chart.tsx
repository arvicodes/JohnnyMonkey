"use client"

import * as React from "react"

import { cn } from "../../lib/utils"

export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode
    icon?: React.ComponentType
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<string, string> }
  )
}

const THEMES = {
  light: {
    background: "hsl(0 0% 100%)",
    foreground: "hsl(222.2 84% 4.9%)",
    primary: "hsl(210 40% 98%)",
    primaryForeground: "hsl(222.2 47.4% 11.2%)",
    secondary: "hsl(210 40% 96%)",
    secondaryForeground: "hsl(215.4 16.3% 46.9%)",
    muted: "hsl(210 40% 96%)",
    mutedForeground: "hsl(215.4 16.3% 46.9%)",
    accent: "hsl(210 40% 96%)",
    accentForeground: "hsl(222.2 47.4% 11.2%)",
    destructive: "hsl(0 84.2% 60.2%)",
    destructiveForeground: "hsl(210 40% 98%)",
    border: "hsl(214.3 31.8% 91.4%)",
    input: "hsl(214.3 31.8% 91.4%)",
    ring: "hsl(215 20.2% 65.1%)",
    chart: "hsl(0 0% 100%)",
    chartForeground: "hsl(222.2 84% 4.9%)",
    popover: "hsl(0 0% 100%)",
    popoverForeground: "hsl(222.2 84% 4.9%)",
    card: "hsl(0 0% 100%)",
    cardForeground: "hsl(222.2 84% 4.9%)",
  },
  dark: {
    background: "hsl(222.2 84% 4.9%)",
    foreground: "hsl(210 40% 98%)",
    primary: "hsl(217.2 91.2% 59.8%)",
    primaryForeground: "hsl(222.2 47.4% 11.2%)",
    secondary: "hsl(217.2 32.6% 17.5%)",
    secondaryForeground: "hsl(210 40% 98%)",
    muted: "hsl(217.2 32.6% 17.5%)",
    mutedForeground: "hsl(215 20.2% 65.1%)",
    accent: "hsl(217.2 32.6% 17.5%)",
    accentForeground: "hsl(210 40% 98%)",
    destructive: "hsl(0 62.8% 30.6%)",
    destructiveForeground: "hsl(0 85.7% 97.3%)",
    border: "hsl(217.2 32.6% 17.5%)",
    input: "hsl(217.2 32.6% 17.5%)",
    ring: "hsl(224.3 76.3% 94.1%)",
    chart: "hsl(222.2 84% 4.9%)",
    chartForeground: "hsl(210 40% 98%)",
    popover: "hsl(222.2 84% 4.9%)",
    popoverForeground: "hsl(210 40% 98%)",
    card: "hsl(222.2 84% 4.9%)",
    cardForeground: "hsl(210 40% 98%)",
  },
} as const

type ChartContextProps = {
  config: ChartConfig
}

const ChartContext = React.createContext<ChartContextProps>({
  config: {},
})

function useChart() {
  const context = React.useContext(ChartContext)
  if (!context) {
    throw new Error("useChart must be used within a ChartProvider")
  }
  return context
}

const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    config: ChartConfig
  }
>(({ config, className, children, ...props }, ref) => {
  return (
    <ChartContext.Provider value={{ config }}>
      <div
        ref={ref}
        className={cn("h-full w-full", className)}
        {...props}
      >
        {children}
      </div>
    </ChartContext.Provider>
  )
})
ChartContainer.displayName = "ChartContainer"

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const theme = Object.entries(config).reduce((acc, [key, value]) => {
    if (value?.theme) {
      acc[key] = value.theme
    }
    return acc
  }, {} as Record<string, Record<keyof typeof THEMES, string>>)

  return (
    <style
      id={id}
      dangerouslySetInnerHTML={{
        __html: Object.entries(theme)
          .map(([key, theme]) => {
            return Object.entries(theme)
              .map(([themeKey, value]) => {
                return `--chart-${key}-${themeKey}: ${value};`
              })
              .join("\n")
          })
          .join("\n"),
      }}
    />
  )
}

// Placeholder components for recharts compatibility
const ChartTooltip = ({ children, ...props }: any) => {
  return <div {...props}>{children}</div>
}

const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    active?: boolean
    payload?: any[]
    hideLabel?: boolean
    hideIndicator?: boolean
    indicator?: "line" | "dot" | "dashed"
    nameKey?: string
    labelKey?: string
    label?: any
    labelFormatter?: any
    labelClassName?: string
    formatter?: any
    color?: string
  }
>(
  (
    {
      active,
      payload,
      className,
      indicator = "dot",
      hideLabel = false,
      hideIndicator = false,
      label,
      labelFormatter,
      labelClassName,
      formatter,
      color,
      nameKey,
      labelKey,
    },
    ref
  ) => {
    const { config } = useChart()

    if (!active || !payload?.length) {
      return null
    }

    return (
      <div
        ref={ref}
        className={cn(
          "grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl",
          className
        )}
      >
        <div className="grid gap-1.5">
          {payload.map((item, index) => {
            const key = `${nameKey || item.name || item.dataKey || "value"}`
            const itemConfig = config[key]
            const indicatorColor = color || item.payload?.fill || item.color

            return (
              <div
                key={item.dataKey}
                className={cn(
                  "flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground",
                  indicator === "dot" && "items-center"
                )}
              >
                {formatter && item?.value !== undefined && item.name ? (
                  formatter(item.value, item.name, item, index, item.payload)
                ) : (
                  <>
                    {itemConfig?.icon ? (
                      <itemConfig.icon />
                    ) : (
                      !hideIndicator && (
                        <div
                          className={cn(
                            "shrink-0 rounded-[2px] border-[--color-border] bg-[--color-bg]",
                            {
                              "h-2.5 w-2.5": indicator === "dot",
                              "w-1": indicator === "line",
                              "w-0 border-[1.5px] border-dashed bg-transparent":
                                indicator === "dashed",
                            }
                          )}
                          style={
                            {
                              "--color-bg": indicatorColor,
                              "--color-border": indicatorColor,
                            } as React.CSSProperties
                          }
                        />
                      )
                    )}
                    <div
                      className={cn(
                        "flex flex-1 justify-between leading-none",
                        "items-center"
                      )}
                    >
                      <div className="grid gap-1.5">
                        <span className="text-muted-foreground">
                          {itemConfig?.label || item.name}
                        </span>
                      </div>
                      {item.value && (
                        <span className="font-mono font-medium tabular-nums text-foreground">
                          {item.value.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }
)
ChartTooltipContent.displayName = "ChartTooltip"

const ChartLegend = ({ children, ...props }: any) => {
  return <div {...props}>{children}</div>
}

const ChartLegendContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    payload?: any[]
    verticalAlign?: string
    hideIcon?: boolean
    nameKey?: string
  }
>(
  (
    { className, hideIcon = false, payload, verticalAlign = "bottom", nameKey },
    ref
  ) => {
    const { config } = useChart()

    if (!payload?.length) {
      return null
    }

    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center justify-center gap-4",
          verticalAlign === "top" ? "pb-3" : "pt-3",
          className
        )}
      >
        {payload.map((item) => {
          const key = `${nameKey || item.dataKey || "value"}`
          const itemConfig = config[key]

          return (
            <div
              key={item.value}
              className={cn(
                "flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-muted-foreground"
              )}
            >
              {itemConfig?.icon && !hideIcon ? (
                <itemConfig.icon />
              ) : (
                <div
                  className="h-2 w-2 shrink-0 rounded-[2px]"
                  style={{
                    backgroundColor: item.color,
                  }}
                />
              )}
              {itemConfig?.label}
            </div>
          )
        })}
      </div>
    )
  }
)
ChartLegendContent.displayName = "ChartLegend"

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
}
