import { useGetScraperStatus, useGetSchedulerStatus } from "@workspace/api-client-react";

function ConfigRow({ label, envVar, configured = true }: { label: string; envVar: string; configured?: boolean }) {
  return (
    <div className="flex items-center justify-between p-4 bg-background border-2 border-border rounded-2xl">
      <div>
        <div className="text-sm font-bold text-foreground">{label}</div>
        <div className="text-xs text-muted-foreground font-medium mt-0.5">{envVar}</div>
      </div>
      {configured ? (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
          ✅ Ready
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">
          ⚠️ Not set
        </span>
      )}
    </div>
  );
}

export function Settings() {
  const { data: scraperStatus } = useGetScraperStatus();
  const { data: schedulerStatus } = useGetSchedulerStatus();

  const hasCredentials = scraperStatus?.hasCredentials ?? false;
  const hasSms = schedulerStatus?.smsConfigured ?? false;

  return (
    <div className="space-y-6 max-w-3xl">
      <header className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-3xl">⚙️</span>
          <h1 className="text-3xl font-extrabold tracking-tight">Settings</h1>
        </div>
        <p className="text-muted-foreground font-medium">
          Check that all the robot's tools are ready to go!
        </p>
      </header>

      {/* Burnaby Login */}
      <div className="bg-card border-2 border-card-border rounded-3xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-card-border bg-blue-50 flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-blue-500 flex items-center justify-center text-2xl shadow-sm">
            🔐
          </div>
          <div>
            <h2 className="font-extrabold text-base text-blue-900">Burnaby WebReg Login</h2>
            <p className="text-xs text-blue-700 font-medium mt-0.5">
              The robot uses these to log in and grab activity spots
            </p>
          </div>
        </div>
        <div className="p-5 space-y-3">
          <ConfigRow label="Username" envVar="BURNABY_USERNAME" configured={hasCredentials} />
          <ConfigRow label="Password" envVar="BURNABY_PASSWORD" configured={hasCredentials} />
          <ConfigRow label="Member ID" envVar="BURNABY_MEMBER_ID" configured={hasCredentials} />
        </div>
      </div>

      {/* SMS Notifications */}
      <div className="bg-card border-2 border-card-border rounded-3xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-card-border bg-purple-50 flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-purple-500 flex items-center justify-center text-2xl shadow-sm">
            📱
          </div>
          <div>
            <h2 className="font-extrabold text-base text-purple-900">Text Message Alerts</h2>
            <p className="text-xs text-purple-700 font-medium mt-0.5">
              The robot texts you the moment a spot is grabbed!
            </p>
          </div>
        </div>
        <div className="p-5 space-y-3">
          <ConfigRow label="Twilio Account SID" envVar="TWILIO_ACCOUNT_SID" configured={hasSms} />
          <ConfigRow label="Twilio Auth Token" envVar="TWILIO_AUTH_TOKEN" configured={hasSms} />
          <ConfigRow label="From Phone Number" envVar="TWILIO_FROM_NUMBER" configured={hasSms} />
          <ConfigRow label="Your Phone Number" envVar="NOTIFY_PHONE_NUMBER" configured={hasSms} />
        </div>
      </div>

      {/* API Access */}
      <div className="bg-card border-2 border-card-border rounded-3xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-card-border bg-orange-50 flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-orange-400 flex items-center justify-center text-2xl shadow-sm">
            🔑
          </div>
          <div>
            <h2 className="font-extrabold text-base text-orange-900">Robot API Key</h2>
            <p className="text-xs text-orange-700 font-medium mt-0.5">
              Protects the booking trigger from unauthorized use
            </p>
          </div>
        </div>
        <div className="p-5">
          <ConfigRow label="API Key" envVar="BURNABY_API_KEY" />
        </div>
      </div>

      {/* Security note */}
      <div className="flex items-start gap-3 p-4 border-2 border-blue-200 bg-blue-50 rounded-2xl text-blue-700 text-sm">
        <span className="text-xl shrink-0">🛡️</span>
        <p className="font-medium">
          <strong className="font-extrabold">Keeping you safe:</strong> We never store your passwords in our database.
          All secrets live only in the server's environment — change them by updating the Replit secrets and restarting.
        </p>
      </div>
    </div>
  );
}
