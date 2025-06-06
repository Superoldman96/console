import { ApiOrganisationPlanChoices, NetworkAccessPolicyType } from '@/apollo/graphql'
import { Button } from '@/components/common/Button'
import { EmptyState } from '@/components/common/EmptyState'
import GenericDialog from '@/components/common/GenericDialog'
import { ToggleSwitch } from '@/components/common/ToggleSwitch'
import { organisationContext } from '@/contexts/organisationContext'
import { userHasPermission } from '@/utils/access/permissions'
import { useContext, useEffect, useRef, useState } from 'react'
import { FaNetworkWired, FaGlobe, FaBan, FaPlus } from 'react-icons/fa'
import { IPChip } from './IPChip'
import { GetNetworkPolicies } from '@/graphql/queries/access/getNetworkPolicies.gql'
import { UpdateAccessPolicies } from '@/graphql/mutations/access/updateNetworkAccessPolicy.gql'
import { useMutation, useQuery } from '@apollo/client'
import { isClientIpAllowed } from '@/utils/access/ip'
import { toast } from 'react-toastify'
import { arraysEqual } from '@/utils/crypto'
import { PlanLabel } from '@/components/settings/organisation/PlanLabel'
import { UpsellDialog } from '@/components/settings/organisation/UpsellDialog'

export const ManageOrgGlobalPolicies = () => {
  const { activeOrganisation: organisation } = useContext(organisationContext)

  // Permissions
  const userCanReadNetworkPolicies = organisation
    ? userHasPermission(organisation?.role?.permissions, 'NetworkAccessPolicies', 'read')
    : false
  const userCanUpdateNetworkPolicies = organisation
    ? userHasPermission(organisation?.role?.permissions, 'NetworkAccessPolicies', 'update')
    : false

  const [policies, setPolicies] = useState<NetworkAccessPolicyType[]>([])

  const { data, loading } = useQuery(GetNetworkPolicies, {
    variables: { organisationId: organisation?.id },
    skip: !organisation || !userCanReadNetworkPolicies,
  })

  const [updatePolicies, { loading: updateIsPending }] = useMutation(UpdateAccessPolicies)

  const clientIp = data?.clientIp

  useEffect(() => {
    if (data?.networkAccessPolicies) {
      setPolicies(data.networkAccessPolicies)
    }
  }, [data])

  const dialogRef = useRef<{ closeModal: () => void }>(null)

  const handleToggleGlobal = (policyId: string) => {
    setPolicies((prevPolicies) =>
      prevPolicies.map((policy) =>
        policy.id === policyId ? { ...policy, isGlobal: !policy.isGlobal } : policy
      )
    )
  }

  const closeModal = () => dialogRef.current?.closeModal()

  const saveRequired = data
    ? !arraysEqual(
        data?.networkAccessPolicies
          .filter((policy: NetworkAccessPolicyType) => policy.isGlobal)
          .map((policy: NetworkAccessPolicyType) => policy.id),
        policies
          .filter((policy: NetworkAccessPolicyType) => policy.isGlobal)
          .map((policy: NetworkAccessPolicyType) => policy.id)
      )
    : false

  const handleSave = async () => {
    const globalIps = policies
      .filter((policy) => policy.isGlobal)
      .flatMap((policy) => policy.allowedIps.split(',').map((ip) => ip.trim()))

    if (clientIp && !isClientIpAllowed(globalIps, clientIp)) {
      const confirm = window.confirm(
        `Warning: Your current IP (${clientIp}) is not in the allowed list or any CIDR range. You may be locked out. Continue?`
      )
      if (!confirm) return
    }

    // Get list of policy IDs whose isGlobal has changed
    const changedPolicyIds =
      data?.networkAccessPolicies
        .filter((policy: NetworkAccessPolicyType) => {
          const updated = policies.find((p) => p.id === policy.id)
          return updated && updated.isGlobal !== policy.isGlobal
        })
        .map((policy: NetworkAccessPolicyType) => policy.id) || []

    // Only include changed policies
    const inputs = policies
      .filter((p) => changedPolicyIds.includes(p.id))
      .map((p) => ({
        id: p.id,
        name: p.name,
        allowedIps: p.allowedIps,
        isGlobal: p.isGlobal,
      }))

    if (inputs.length === 0) {
      // No changes to save
      toast.info('No changes to save')
      return
    }

    await updatePolicies({
      variables: { inputs },
      refetchQueries: [
        { query: GetNetworkPolicies, variables: { organisationId: organisation?.id } },
      ],
    })
    toast.success('Updated organisation global policies')
    closeModal()
  }

  if (!organisation) return <></>

  if (organisation.plan === ApiOrganisationPlanChoices.Pr)
    return (
      <UpsellDialog
        title="Upgrade to Enterprise to manage global network access policies"
        buttonLabel={
          <>
            <FaNetworkWired /> Manage global policies{' '}
            <PlanLabel plan={ApiOrganisationPlanChoices.En} />{' '}
          </>
        }
      />
    )

  return (
    <GenericDialog
      ref={dialogRef}
      title="Manage Global Network Access Policies"
      size="lg"
      buttonContent={
        <>
          <FaNetworkWired /> Manage global policies
        </>
      }
    >
      <div className="text-neutral-500 text-sm">
        Select one or more network access policies to apply globally to all accounts in the
        organisation
      </div>
      <div className="py-4">
        {userCanReadNetworkPolicies ? (
          <table className="table-auto min-w-full divide-y divide-zinc-500/40 ">
            <thead>
              <tr>
                <th className="py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>

                <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Allowlist
                </th>

                <th className="py-3 px-6 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Enabled
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-500/20">
              {policies.map((policy: NetworkAccessPolicyType) => (
                <tr key={policy.id} className="group">
                  <td className="text-zinc-900 dark:text-zinc-100 font-medium break-word inline-flex items-center gap-1">
                    {policy.name}
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex gap-2 flex-wrap">
                      {policy.allowedIps.split(',').map((ip) => (
                        <IPChip key={ip} ip={ip}></IPChip>
                      ))}
                    </div>
                  </td>

                  <td
                    className="px-6 py-4 flex items-center justify-end gap-2"
                    title={`${policy.isGlobal ? 'Disable' : 'Enable'} this policy`}
                  >
                    <ToggleSwitch
                      value={policy.isGlobal}
                      onToggle={() => handleToggleGlobal(policy.id)}
                      disabled={!userCanUpdateNetworkPolicies}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState
            title="Access restricted"
            subtitle="You don't have the permissions required to view Network Access Policies in this organisation."
            graphic={
              <div className="text-neutral-300 dark:text-neutral-700 text-7xl text-center">
                <FaBan />
              </div>
            }
          >
            <></>
          </EmptyState>
        )}
      </div>

      <div className="flex items-center justify-between mt-4">
        <Button variant="secondary" onClick={closeModal}>
          Cancel
        </Button>
        <Button
          disabled={!userCanUpdateNetworkPolicies || !saveRequired}
          variant="primary"
          onClick={handleSave}
          isLoading={updateIsPending}
        >
          Save
        </Button>
      </div>
    </GenericDialog>
  )
}
