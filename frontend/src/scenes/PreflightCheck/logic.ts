import { kea } from 'kea'
import api from 'lib/api'
import { PreflightStatus } from '~/types'
import { preflightLogicType } from './logicType'
import posthog from 'posthog-js'

type PreflightMode = 'experimentation' | 'live'

export const preflightLogic = kea<preflightLogicType<PreflightStatus, PreflightMode>>({
    loaders: ({ actions }) => ({
        preflight: [
            null as PreflightStatus | null,
            {
                loadPreflight: async () => {
                    const response = await api.get('_preflight/')
                    actions.registerInstrumentationProps()
                    return response
                },
            },
        ],
    }),
    actions: {
        registerInstrumentationProps: true,
        setPreflightMode: (mode: PreflightMode | null, noReload?: boolean) => ({ mode, noReload }),
    },
    reducers: {
        preflightMode: [
            null as PreflightMode | null,
            {
                setPreflightMode: (_, { mode }) => mode,
            },
        ],
    },
    selectors: {
        socialAuthAvailable: [
            (s) => [s.preflight],
            (preflight): boolean =>
                Boolean(preflight && Object.values(preflight.available_social_auth_providers).filter((i) => i).length),
        ],
        realm: [
            (s) => [s.preflight],
            (preflight): 'cloud' | 'hosted' | null => {
                if (!preflight) {
                    return null
                }
                return preflight.cloud ? 'cloud' : 'hosted'
            },
        ],
        siteUrlMisconfigured: [
            (s) => [s.preflight],
            (preflight): boolean => {
                return Boolean(preflight && (!preflight.site_url || preflight.site_url != window.location.origin))
            },
        ],
        organizationCreationAllowed: [
            (s) => [s.preflight],
            (preflight): boolean => {
                // Organization creation is disallowed on initiated private instances for security
                return !preflight || preflight.cloud || !preflight.initiated
            },
        ],
        configOptions: [
            (s) => [s.preflight],
            (preflight): Record<string, string>[] => {
                // Returns the preflight config options to display in the /instance/status page

                const RELEVANT_CONFIGS = [
                    {
                        key: 'site_url',
                        label: 'Site URL',
                    },
                    { key: 'email_service_available', label: 'Email service available' },
                ]

                if (!preflight) {
                    return []
                }
                // @ts-ignore
                return RELEVANT_CONFIGS.map((config) => ({ metric: config.label, value: preflight[config.key] }))
            },
        ],
    },
    listeners: ({ values, actions }) => ({
        registerInstrumentationProps: async (_, breakpoint) => {
            await breakpoint(100)
            if (posthog && values.preflight) {
                posthog.register({
                    posthog_version: values.preflight.posthog_version,
                    realm: values.realm,
                    is_clickhouse_enabled: values.preflight.is_clickhouse_enabled,
                    ee_available: values.preflight.ee_available,
                    email_service_available: values.preflight.email_service_available,
                })
            }
        },
        setPreflightMode: async ({ mode, noReload }) => {
            if (mode && !noReload) {
                actions.loadPreflight()
            }
        },
    }),
    events: ({ actions }) => ({
        afterMount: () => {
            actions.loadPreflight()
        },
    }),
    actionToUrl: ({ values }) => ({
        setPreflightMode: () => ['/preflight', { mode: values.preflightMode }],
    }),
    urlToAction: ({ actions }) => ({
        '/preflight': (_: any, { mode }: { mode: PreflightMode | null }) => {
            if (mode) {
                actions.setPreflightMode(mode, true)
            }
        },
    }),
})
