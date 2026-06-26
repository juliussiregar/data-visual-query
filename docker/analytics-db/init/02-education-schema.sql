-- Education demo schema (same database as IoT — namespace terpisah)

CREATE SCHEMA IF NOT EXISTS education;

CREATE TABLE IF NOT EXISTS education.students (
    id              SERIAL PRIMARY KEY,
    student_code    VARCHAR(20) NOT NULL UNIQUE,
    full_name       VARCHAR(120) NOT NULL,
    region          VARCHAR(80) NOT NULL,
    jurusan         VARCHAR(40) NOT NULL,
    kelas           VARCHAR(10) NOT NULL
);

CREATE TABLE IF NOT EXISTS education.student_grades (
    id              BIGSERIAL PRIMARY KEY,
    student_id      INTEGER NOT NULL REFERENCES education.students(id) ON DELETE CASCADE,
    student_code    VARCHAR(20) NOT NULL,
    full_name       VARCHAR(120) NOT NULL,
    region          VARCHAR(80) NOT NULL,
    jurusan         VARCHAR(40) NOT NULL,
    kelas           VARCHAR(10) NOT NULL,
    semester        VARCHAR(10) NOT NULL DEFAULT '1',
    tugas           NUMERIC(5, 2) NOT NULL,
    ulangan         NUMERIC(5, 2) NOT NULL,
    ujian           NUMERIC(5, 2) NOT NULL,
    fisika          NUMERIC(5, 2) NOT NULL,
    biologi         NUMERIC(5, 2) NOT NULL,
    recorded_at     DATE NOT NULL DEFAULT CURRENT_DATE,
    UNIQUE (student_id, semester)
);

CREATE INDEX IF NOT EXISTS idx_education_students_region ON education.students (region);
CREATE INDEX IF NOT EXISTS idx_student_grades_region ON education.student_grades (region);
CREATE INDEX IF NOT EXISTS idx_student_grades_jurusan ON education.student_grades (jurusan);
