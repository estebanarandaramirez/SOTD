// Apple Developer Team ID, from developer.apple.com/account → Membership Details.
const APPLE_TEAM_ID = "72L5M7CHRH";

export const appleAppSiteAssociation = {
  applinks: {
    apps: [] as string[],
    details: [
      {
        appID: `${APPLE_TEAM_ID}.com.sotd.app`,
        paths: ["/post/*", "/profile/*", "/reset-password"],
      },
    ],
  },
};
