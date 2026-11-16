import { Tabs } from "expo-router";
import { GitPullRequest, LayoutDashboard, Settings, TerminalSquare } from "lucide-react-native";
import { COLORS } from "@/theme/colors";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        sceneStyle: { backgroundColor: COLORS.bg },
        headerStyle: { backgroundColor: COLORS.surface },
        headerTintColor: COLORS.fg,
        headerTitleStyle: { fontWeight: "600", fontSize: 16 },
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
          height: 62,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.fgMuted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="workspace"
        options={{
          title: "Workspace",
          tabBarIcon: ({ color, size }) => <TerminalSquare color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="workflows"
        options={{
          title: "SDLC",
          tabBarIcon: ({ color, size }) => <GitPullRequest color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => <Settings color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
