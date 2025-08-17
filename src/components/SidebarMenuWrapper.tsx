import { Sidebar, SidebarContent, SidebarProvider } from "@/components/ui/sidebar.tsx";
import { Outlet } from "react-router";
import { SidebarMenuContent } from "@/components/SidebarMenuContent.tsx";

export const SidebarMenuWrapper = () => {
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarContent>
          <SidebarMenuContent />
        </SidebarContent>
      </Sidebar>
      <main className={"w-full"}>
        <Outlet />
      </main>
    </SidebarProvider>
  );
};
