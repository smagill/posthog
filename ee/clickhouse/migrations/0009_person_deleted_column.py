from infi.clickhouse_orm import migrations


class Migration(migrations.Migration):
    operations = [migrations.RunSQL("ALTER TABLE posthog.person ADD COLUMN IF NOT EXISTS is_deleted UInt8 DEFAULT 0")]