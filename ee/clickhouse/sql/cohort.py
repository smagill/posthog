CALCULATE_COHORT_PEOPLE_SQL = """
SELECT distinct_id FROM ({latest_distinct_id_sql}) where {query} AND team_id = %(team_id)s
"""

CREATE_COHORTPEOPLE_TABLE_SQL = """
CREATE TABLE cohortpeople
(
    person_id UUID,
    cohort_id Int64,
    team_id Int64,
    sign Int8
) ENGINE = CollapsingMergeTree(sign)
Order By (team_id, cohort_id, person_id)
"""

DROP_COHORTPEOPLE_TABLE_SQL = """
DROP TABLE cohortpeople
"""
