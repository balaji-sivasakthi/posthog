import './Billing.scss'

import { LemonButton, LemonDivider, LemonInput, Link } from '@posthog/lemon-ui'
import clsx from 'clsx'
import { useActions, useValues } from 'kea'
import { Field, Form } from 'kea-forms'
import { router } from 'kea-router'
import { PoliceHog } from 'lib/components/hedgehogs'
import { RestrictionScope, useRestrictedArea } from 'lib/components/RestrictedArea'
import { supportLogic } from 'lib/components/Support/supportLogic'
import { OrganizationMembershipLevel } from 'lib/constants'
import { dayjs } from 'lib/dayjs'
import { useResizeBreakpoints } from 'lib/hooks/useResizeObserver'
import { LemonBanner } from 'lib/lemon-ui/LemonBanner'
import { LemonLabel } from 'lib/lemon-ui/LemonLabel/LemonLabel'
import { SpinnerOverlay } from 'lib/lemon-ui/Spinner/Spinner'
import { humanFriendlyCurrency, toSentenceCase } from 'lib/utils'
import { useEffect } from 'react'
import { preflightLogic } from 'scenes/PreflightCheck/preflightLogic'
import { SceneExport } from 'scenes/sceneTypes'
import { urls } from 'scenes/urls'

import { BillingCTAHero } from './BillingCTAHero'
import { billingLogic } from './billingLogic'
import { BillingProduct } from './BillingProduct'
import { CreditCTAHero } from './CreditCTAHero'
import { UnsubscribeCard } from './UnsubscribeCard'

export const scene: SceneExport = {
    component: Billing,
    logic: billingLogic,
}

export function Billing(): JSX.Element {
    const {
        billing,
        billingLoading,
        isOnboarding,
        showLicenseDirectInput,
        isActivateLicenseSubmitting,
        billingError,
        isManagedAccount,
    } = useValues(billingLogic)
    const { reportBillingShown } = useActions(billingLogic)
    const { preflight, isCloudOrDev } = useValues(preflightLogic)
    const { openSupportForm } = useActions(supportLogic)

    const restrictionReason = useRestrictedArea({
        minimumAccessLevel: OrganizationMembershipLevel.Admin,
        scope: RestrictionScope.Organization,
    })

    if (preflight && !isCloudOrDev) {
        router.actions.push(urls.default())
    }

    useEffect(() => {
        if (billing) {
            reportBillingShown()
        }
    }, [!!billing])

    const { ref, size } = useResizeBreakpoints({
        0: 'small',
        1000: 'medium',
    })

    if (!billing && billingLoading) {
        return (
            <>
                <SpinnerOverlay sceneLevel />
            </>
        )
    }

    if (restrictionReason) {
        return (
            <div className="deprecated-space-y-4">
                <h1>Billing</h1>
                <LemonBanner type="warning">{restrictionReason}</LemonBanner>
                <div className="flex">
                    <LemonButton type="primary" to={urls.default()}>
                        Go back home
                    </LemonButton>
                </div>
            </div>
        )
    }

    if (!billing && !billingLoading) {
        return (
            <div className="deprecated-space-y-4">
                <LemonBanner type="error">
                    {
                        'There was an issue retrieving your current billing information. If this message persists, please '
                    }
                    {preflight?.cloud ? (
                        <Link onClick={() => openSupportForm({ kind: 'bug', target_area: 'billing' })}>
                            submit a bug report
                        </Link>
                    ) : (
                        <Link to="mailto:sales@posthog.com">contact sales@posthog.com</Link>
                    )}
                    .
                </LemonBanner>
            </div>
        )
    }

    const products = billing?.products
    const platformAndSupportProduct = products?.find((product) => product.type === 'platform_and_support')
    return (
        <div ref={ref}>
            {showLicenseDirectInput && (
                <>
                    <Form
                        logic={billingLogic}
                        formKey="activateLicense"
                        enableFormOnSubmit
                        className="deprecated-space-y-4"
                    >
                        <Field name="license" label="Activate license key">
                            <LemonInput fullWidth autoFocus />
                        </Field>

                        <LemonButton
                            type="primary"
                            htmlType="submit"
                            loading={isActivateLicenseSubmitting}
                            fullWidth
                            center
                        >
                            Activate license key
                        </LemonButton>
                    </Form>
                </>
            )}

            {billingError && (
                <LemonBanner type={billingError.status} className="mb-2" action={billingError.action}>
                    {billingError.message}
                </LemonBanner>
            )}

            {billing?.trial ? (
                <LemonBanner type="info" hideIcon className="mb-2">
                    <div className="flex items-center gap-4">
                        <PoliceHog className="w-20 h-20 flex-shrink-0" />
                        <div>
                            <p className="text-lg">You're on (a) trial</p>
                            <p>
                                You are currently on a free trial for <b>{toSentenceCase(billing.trial.target)} plan</b>{' '}
                                until <b>{dayjs(billing.trial.expires_at).format('LL')}</b>.
                                {billing.trial.type === 'autosubscribe' &&
                                    ' At the end of the trial you will be automatically subscribed to the plan.'}
                            </p>
                        </div>
                    </div>
                </LemonBanner>
            ) : null}

            {!isManagedAccount && !billing?.has_active_subscription && !billing?.trial && platformAndSupportProduct && (
                <div className="mb-4">
                    <BillingCTAHero product={platformAndSupportProduct} />
                </div>
            )}

            <CreditCTAHero />

            <div
                className={clsx('flex justify-between', {
                    'flex-col gap-4': size === 'small',
                    'flex-row': size !== 'small',
                })}
            >
                <div>
                    <div
                        className={clsx('flex flex-wrap gap-6 w-fit mb-4', {
                            'flex-col items-stretch': size === 'small',
                            'items-center': size !== 'small',
                        })}
                    >
                        {!isOnboarding && billing?.billing_period && (
                            <div className="flex-1 pt-2">
                                <div className="deprecated-space-y-4">
                                    {billing?.has_active_subscription && (
                                        <>
                                            <div className="flex flex-row gap-10 items-end">
                                                <div>
                                                    <LemonLabel
                                                        info={`This is the current amount you have been billed for this ${billing.billing_period.interval} so far. This number updates once daily.`}
                                                    >
                                                        Current bill total
                                                    </LemonLabel>
                                                    <div className="font-bold text-6xl">
                                                        {billing.discount_percent
                                                            ? // if they have a discount percent, we want to show the amount they are due - so the total after discount
                                                              humanFriendlyCurrency(
                                                                  billing.current_total_amount_usd_after_discount
                                                              )
                                                            : // but if they have credits, we want to show the amount they are due before credits,
                                                              // so they know what their total deduction will be
                                                              // We don't let people have credits and discounts at the same time
                                                              humanFriendlyCurrency(billing.current_total_amount_usd)}
                                                    </div>
                                                </div>
                                                {billing?.projected_total_amount_usd &&
                                                    parseFloat(billing?.projected_total_amount_usd) > 0 && (
                                                        <div>
                                                            <LemonLabel
                                                                info="This is roughly calculated based on your current bill and the remaining time left in this billing period. This number updates once daily."
                                                                className="text-secondary"
                                                            >
                                                                Projected total
                                                            </LemonLabel>
                                                            <div className="font-semibold text-2xl text-secondary">
                                                                {billing.discount_percent
                                                                    ? humanFriendlyCurrency(
                                                                          billing.projected_total_amount_usd_after_discount
                                                                      )
                                                                    : humanFriendlyCurrency(
                                                                          billing?.projected_total_amount_usd
                                                                      )}
                                                            </div>
                                                        </div>
                                                    )}
                                                {billing?.discount_amount_usd && (
                                                    <div>
                                                        <LemonLabel
                                                            info={`The total credits remaining in your account. ${
                                                                billing?.amount_off_expires_at
                                                                    ? 'Your credits expire on ' +
                                                                      billing?.amount_off_expires_at?.format('LL')
                                                                    : null
                                                            }`}
                                                            className="text-secondary"
                                                        >
                                                            Available credits
                                                        </LemonLabel>
                                                        <div className="font-semibold text-2xl text-secondary">
                                                            {humanFriendlyCurrency(billing?.discount_amount_usd, 0)}
                                                        </div>
                                                    </div>
                                                )}
                                                {billing?.discount_percent && (
                                                    <div>
                                                        <LemonLabel
                                                            info="The discount applied to your current bill, reflected in the total amount."
                                                            className="text-secondary"
                                                        >
                                                            Applied discount
                                                        </LemonLabel>
                                                        <div className="font-semibold text-2xl text-secondary">
                                                            {billing.discount_percent}%
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}
                                    <div>
                                        <p className="ml-0 mb-0">
                                            {billing?.has_active_subscription ? 'Billing period' : 'Cycle'}:{' '}
                                            <b>{billing.billing_period.current_period_start.format('LL')}</b> to{' '}
                                            <b>{billing.billing_period.current_period_end.format('LL')}</b> (
                                            {billing.billing_period.current_period_end.diff(dayjs(), 'days')} days
                                            remaining)
                                        </p>
                                        {!billing.has_active_subscription && (
                                            <p className="italic ml-0 text-secondary mb-0">
                                                Monthly free allocation resets at the end of the cycle.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {!isOnboarding && billing?.customer_id && billing?.stripe_portal_url && (
                        <div className="w-fit">
                            <LemonButton
                                type="primary"
                                htmlType="submit"
                                to={billing.stripe_portal_url}
                                disableClientSideRouting
                                targetBlank
                                center
                                data-attr="manage-billing"
                            >
                                {billing.has_active_subscription
                                    ? 'Manage card details and invoices'
                                    : 'View past invoices'}
                            </LemonButton>
                        </div>
                    )}
                </div>
            </div>

            <LemonDivider className="mt-6 mb-8" />

            <div className="flex justify-between mt-4">
                <h2>Products</h2>
            </div>

            {products
                ?.filter((product) => !product.inclusion_only || product.plans.some((plan) => !plan.included_if))
                ?.map((x) => (
                    <div key={x.type}>
                        <BillingProduct product={x} />
                    </div>
                ))}
            <div>
                {billing?.subscription_level == 'paid' && !!platformAndSupportProduct ? (
                    <>
                        <LemonDivider />
                        <UnsubscribeCard product={platformAndSupportProduct} />
                    </>
                ) : null}
            </div>
        </div>
    )
}
