import { GetSettingsUseCase } from '../../../../application/settings/use-cases/get-settings.use-case';
import { SettingsClient } from './settings-client';
import { assertPagePermission } from '../../../../infrastructure/auth/page-guard';
import { PermissionCode } from '../../../../domain/staff/enums/permission.enum';

export default async function SettingsPage() {
  await assertPagePermission(PermissionCode.MANAGE_SETTINGS);

  const getSettingsUseCase = new GetSettingsUseCase();
  const settings = await getSettingsUseCase.execute();

  return (
    <SettingsClient
      initialSettings={{
        id: settings.id,
        nameAr: settings.nameAr,
        nameEn: settings.nameEn,
        logoUrl: settings.logoUrl,
        currency: settings.currency,
        currencySymbol: settings.currencySymbol,
        locale: settings.locale,
        taxRatePercent: Number(settings.taxRatePercent),
        deliveryFee: settings.deliveryFee,
        phone: settings.phone,
        address: settings.address,
      }}
    />
  );
}
