import { FaTrashAlt } from 'react-icons/fa'
import { DeleteServiceAccountTokenOp } from '@/graphql/mutations/service-accounts/deleteServiceAccountToken.gql'
import { GetServiceAccountTokens } from '@/graphql/queries/service-accounts/getServiceAccountTokens.gql'
import { useMutation } from '@apollo/client'
import { toast } from 'react-toastify'
import { useContext, useRef } from 'react'
import { organisationContext } from '@/contexts/organisationContext'
import { ServiceAccountTokenType, ServiceAccountType } from '@/apollo/graphql'
import { Button } from '@/components/common/Button'
import GenericDialog from '@/components/common/GenericDialog'
import { useRouter } from 'next/navigation'
import { userHasPermission } from '@/utils/access/permissions'

export const DeleteServiceAccountTokenDialog = ({
  token,
  serviceAccountId,
}: {
  token: ServiceAccountTokenType
  serviceAccountId: string
}) => {
  const { activeOrganisation: organisation } = useContext(organisationContext)

  const userCanDeleteTokens = organisation
    ? userHasPermission(organisation.role?.permissions, 'ServiceAccountTokens', 'delete')
    : false

  const dialogRef = useRef<{ closeModal: () => void }>(null)

  const [deleteToken, { loading }] = useMutation(DeleteServiceAccountTokenOp)

  const handleDelete = async () => {
    const deleted = await deleteToken({
      variables: { id: token.id },
      refetchQueries: [
        {
          query: GetServiceAccountTokens,
          variables: { orgId: organisation!.id, id: serviceAccountId },
        },
      ],
    })
    if (deleted.data.deleteServiceAccountToken.ok) {
      toast.success('Deleted token!')
      if (dialogRef.current) dialogRef.current.closeModal()
    }
  }

  if (!userCanDeleteTokens) return <></>

  return (
    <GenericDialog
      title={`Delete ${token.name}`}
      buttonContent={
        <span className="flex items-center gap-1">
          <FaTrashAlt /> Delete
        </span>
      }
      buttonVariant="danger"
      ref={dialogRef}
    >
      <div className="space-y-4">
        <div className="text-neutral-500 py-4">Are you sure you want to delete this token?</div>
        <div className="flex justify-end">
          <Button variant="danger" onClick={handleDelete} isLoading={loading}>
            <FaTrashAlt /> Delete
          </Button>
        </div>
      </div>
    </GenericDialog>
  )
}
